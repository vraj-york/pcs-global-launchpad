# AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.11

# Set working directory to Lambda task root
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy requirements first for better caching
COPY api/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY . .

# Lambda handler
# Format: module.submodule.function
CMD ["api.lambda_handler.handler"]
