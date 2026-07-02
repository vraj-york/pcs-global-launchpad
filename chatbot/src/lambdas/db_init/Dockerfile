# Use AWS Lambda Python 3.11 base image
FROM public.ecr.aws/lambda/python:3.11

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Lambda function code and migration scripts
COPY handler.py .
COPY migrations/ ./migrations/

# Set the CMD to your handler
CMD ["handler.handler"]
