# AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.11

# Set Lambda working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# ---- Copy dependency files first (better caching) ----
COPY lambdas/ingest/requirements.txt ./

# ---- Install dependencies using pip ----
RUN pip install --no-cache-dir -r requirements.txt

# ---- Copy shared package ----
COPY shared ./shared

# ---- Copy handler ----
COPY lambdas/ingest/handler.py ./

# ---- Lambda handler ----
CMD ["handler.handler"]
