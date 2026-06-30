#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
: "${INFRA_STACK:?}"
: "${DEPLOY_ENVIRONMENT:?}"
: "${BACKEND_STACK_NAME:?}"
: "${FRONTEND_STACK_NAME:?}"

# Integration UI at repo root when Frontend/ is absent (Migrate Frontend layout)
if [[ -d "$ROOT/Frontend" ]]; then
  FRONTEND_LAYER_DIR="$ROOT/Frontend"
elif [[ -d "$ROOT/frontend" ]]; then
  FRONTEND_LAYER_DIR="$ROOT/frontend"
elif [[ -f "$ROOT/cloudformation-template.yaml" && -f "$ROOT/package.json" ]]; then
  FRONTEND_LAYER_DIR="$ROOT"
else
  echo "No frontend layer directory found (expected Frontend/, frontend/, or UI at repo root)" >&2
  exit 1
fi

read_cfn_param() {
  local params_file="$1"
  local key="$2"
  node -e "
    const fs = require('fs');
    const key = process.argv[1];
    const file = process.argv[2];
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    const row = rows.find((r) => r.ParameterKey === key);
    process.stdout.write(row ? String(row.ParameterValue ?? '') : '');
  " "$key" "$params_file"
}

patch_cfn_param() {
  local params_file="$1"
  local key="$2"
  local value="$3"
  node -e "
    const fs = require('fs');
    const [key, value, file] = process.argv.slice(1);
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    const index = rows.findIndex((r) => r.ParameterKey === key);
    if (index >= 0) rows[index].ParameterValue = value;
    else rows.push({ ParameterKey: key, ParameterValue: value });
    fs.writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
  " "$key" "$value" "$params_file"
}

log_stack_failure_events() {
  local stack_name="$1"
  echo "CloudFormation failure events for stack: $stack_name" >&2
  aws cloudformation describe-stack-events --stack-name "$stack_name" \
    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED` || ResourceStatus==`ROLLBACK_IN_PROGRESS`].[Timestamp,LogicalResourceId,ResourceStatusReason]' \
    --output text 2>/dev/null | tail -n 5 >&2 || true
}

recover_failed_stack() {
  local stack_name="$1"
  local status
  status="$(aws cloudformation describe-stacks --stack-name "$stack_name" \
    --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")"
  case "$status" in
    ROLLBACK_COMPLETE|ROLLBACK_FAILED|DELETE_FAILED)
      echo "Recovering failed stack $stack_name (status: $status)" >&2
      aws cloudformation delete-stack --stack-name "$stack_name"
      aws cloudformation wait stack-delete-complete --stack-name "$stack_name"
      ;;
  esac
}

prepare_backend_ecr_image() {
  local params="$ROOT/backend/parameters.json"
  [[ -f "$params" ]] || { echo "Missing backend/parameters.json" >&2; exit 1; }

  local repo_uri tag region account_id
  repo_uri="$(read_cfn_param "$params" "EcrRepositoryUri")"
  tag="$(read_cfn_param "$params" "EcrImageTag")"
  [[ -n "$repo_uri" ]] || { echo "EcrRepositoryUri missing in backend/parameters.json" >&2; exit 1; }
  [[ -n "$tag" ]] || tag="latest"

  region="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
  account_id="$(aws sts get-caller-identity --query Account --output text)"
  local registry="${account_id}.dkr.ecr.${region}.amazonaws.com"

  aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$registry"

  local image_local="devcity-api:${tag}"
  local image_remote="${repo_uri}:${tag}"

  (cd "$ROOT/backend" && docker build -t "$image_local" .)
  docker tag "$image_local" "$image_remote"
  docker push "$image_remote"
}

prepare_backend_artifact() {
  local bucket=""
  if [[ -f "$ROOT/backend/parameters.json" ]]; then
    bucket="$(read_cfn_param "$ROOT/backend/parameters.json" "LambdaCodeS3Bucket")"
  fi
  if [[ -n "$bucket" && "$bucket" != "null" ]]; then
    echo "Lambda preflight not configured for this stack (no LambdaCodeS3Bucket)" >&2
    exit 1
  elif [[ -f "$ROOT/backend/Dockerfile" ]]; then
    prepare_backend_ecr_image
  fi
}

deploy_cloudformation_layer() {
  local layer_dir="$1"
  local stack_name="$2"
  local template="cloudformation-template.yaml"
  local params="parameters.json"

  recover_failed_stack "$stack_name"

  local -a cap_args=()
  if grep -q 'RoleName:' "$layer_dir/$template" 2>/dev/null; then
    cap_args+=(--capabilities CAPABILITY_NAMED_IAM)
  fi

  local -a param_args=()
  if [[ -f "$layer_dir/$params" ]]; then
    param_args+=(--parameters "file://${params}")
  fi

  (
    cd "$layer_dir"
    if aws cloudformation describe-stacks --stack-name "$stack_name" >/dev/null 2>&1; then
      aws cloudformation update-stack \
        --stack-name "$stack_name" \
        --template-body "file://${template}" \
        "${param_args[@]}" "${cap_args[@]}" || {
          local err=$?
          if aws cloudformation describe-stacks --stack-name "$stack_name" \
            --query 'Stacks[0].StackStatus' --output text 2>/dev/null | grep -q 'IN_PROGRESS'; then
            echo "Stack update already in progress for $stack_name" >&2
          else
            log_stack_failure_events "$stack_name"
            exit $err
          fi
        }
      aws cloudformation wait stack-update-complete --stack-name "$stack_name" || {
        log_stack_failure_events "$stack_name"
        exit 1
      }
    else
      aws cloudformation create-stack \
        --stack-name "$stack_name" \
        --template-body "file://${template}" \
        "${param_args[@]}" "${cap_args[@]}" || {
        log_stack_failure_events "$stack_name"
        exit 1
      }
      aws cloudformation wait stack-create-complete --stack-name "$stack_name" || {
        log_stack_failure_events "$stack_name"
        exit 1
      }
    fi
  )
}

deploy_terraform_layer() {
  local layer_dir="$1"
  (cd "$layer_dir" && terraform init && terraform apply -auto-approve)
}

read_cfn_stack_output() {
  local stack_name="$1"
  local output_key="$2"
  aws cloudformation describe-stacks --stack-name "$stack_name" \
    --query "Stacks[0].Outputs[?OutputKey=='${output_key}'].OutputValue | [0]" \
    --output text 2>/dev/null | sed 's/^None$//' || true
}

read_tf_output() {
  local layer_dir="$1"
  local output_key="$2"
  (cd "$layer_dir" && terraform output -raw "$output_key" 2>/dev/null) || true
}

read_stack_output_with_fallbacks() {
  local stack_name="$1"
  local layer_dir="$2"
  shift 2
  local key value
  for key in "$@"; do
    if [[ "$INFRA_STACK" == "terraform" ]]; then
      value="$(read_tf_output "$layer_dir" "$key")"
    else
      value="$(read_cfn_stack_output "$stack_name" "$key")"
    fi
    if [[ -n "$value" && "$value" != "None" ]]; then
      printf '%s' "$value"
      return 0
    fi
  done
  return 1
}

patch_dotenv_key() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  node -e "
    const fs = require('fs');
    const [key, value, file] = process.argv.slice(1);
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch { text = ''; }
    const line = key + '=' + value;
    const pattern = new RegExp('^' + key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '=.*$', 'm');
    text = pattern.test(text) ? text.replace(pattern, line) : (text.trimEnd() + (text.endsWith('\\n') || !text ? '' : '\\n') + line + '\\n');
    fs.writeFileSync(file, text);
  " "$key" "$value" "$env_file"
}

resolve_frontend_build_dir() {
  local ui_root="$1"
  if [[ -d "$ui_root/dist" ]]; then
    printf '%s' "$ui_root/dist"
  elif [[ -d "$ui_root/build" ]]; then
    printf '%s' "$ui_root/build"
  else
    printf '%s' "$ui_root/dist"
  fi
}

publish_frontend_assets() {
  echo "[step] Publishing frontend assets (Phase D)…" >&2

  local api_url
  api_url="$(read_stack_output_with_fallbacks "$BACKEND_STACK_NAME" "$ROOT/backend" \
    ApiBaseUrl ApiUrl HttpApiUrl BackendUrl || true)"
  local ui_env="$FRONTEND_LAYER_DIR/.env"
  if [[ -n "$api_url" ]]; then
    if grep -q '^VITE_API_BASE_URL=' "$ui_env" 2>/dev/null || \
       grep -q 'VITE_API_BASE_URL' "$FRONTEND_LAYER_DIR/.env.example" 2>/dev/null; then
      patch_dotenv_key "$ui_env" "VITE_API_BASE_URL" "$api_url"
    elif grep -q '^REACT_APP_API_BASE_URL=' "$ui_env" 2>/dev/null || \
         grep -q 'REACT_APP_API_BASE_URL' "$FRONTEND_LAYER_DIR/.env.example" 2>/dev/null; then
      patch_dotenv_key "$ui_env" "REACT_APP_API_BASE_URL" "$api_url"
    fi
  fi

  local bucket distribution_id
  bucket="$(read_stack_output_with_fallbacks "$FRONTEND_STACK_NAME" "$FRONTEND_LAYER_DIR" \
    S3BucketName WebsiteBucketName FrontendBucketName || true)"
  distribution_id="$(read_stack_output_with_fallbacks "$FRONTEND_STACK_NAME" "$FRONTEND_LAYER_DIR" \
    CloudFrontDistributionId DistributionId || true)"

  if [[ -z "$bucket" ]]; then
    echo "Frontend stack is missing the S3 bucket output." >&2
    exit 1
  fi
  if [[ -z "$distribution_id" ]]; then
    echo "Frontend stack is missing the CloudFront distribution id output." >&2
    exit 1
  fi

  (cd "$FRONTEND_LAYER_DIR" && npm ci && npm run build)

  local build_dir
  build_dir="$(resolve_frontend_build_dir "$FRONTEND_LAYER_DIR")"
  [[ -d "$build_dir" ]] || { echo "Build output folder not found after npm run build." >&2; exit 1; }

  aws s3 sync "$build_dir/" "s3://${bucket}/" --delete

  local invalidation_id
  invalidation_id="$(aws cloudfront create-invalidation \
    --distribution-id "$distribution_id" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)"
  echo "[step] CloudFront invalidation started: ${invalidation_id}" >&2
}

main() {
  if [[ "$INFRA_STACK" == "cloudformation" ]]; then
    prepare_backend_artifact
    deploy_cloudformation_layer "$ROOT/backend" "$BACKEND_STACK_NAME" &
    local backend_pid=$!
    deploy_cloudformation_layer "$FRONTEND_LAYER_DIR" "$FRONTEND_STACK_NAME" &
    local frontend_pid=$!
    wait "$backend_pid"
    wait "$frontend_pid"
    publish_frontend_assets
  elif [[ "$INFRA_STACK" == "terraform" ]]; then
    prepare_backend_artifact
    deploy_terraform_layer "$ROOT/backend"
    deploy_terraform_layer "$FRONTEND_LAYER_DIR"
    publish_frontend_assets
  else
    echo "Unsupported INFRA_STACK: $INFRA_STACK" >&2
    exit 1
  fi
}

main "$@"
