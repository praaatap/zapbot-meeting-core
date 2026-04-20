#!/bin/bash
awslocal sqs create-queue --queue-name echomeet-transcription-queue
awslocal sqs create-queue --queue-name echomeet-diarization-queue
awslocal sqs create-queue --queue-name echomeet-summary-queue
awslocal sqs create-queue --queue-name echomeet-delivery-queue
awslocal sqs create-queue --queue-name echomeet-dead-letter-queue

awslocal s3 mb s3://echomeet-raw-audio
awslocal s3 mb s3://echomeet-reports

awslocal ses verify-email-identity --email-address reports@echomeet.ai

echo "LocalStack resources initialized successfully"
