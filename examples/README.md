# Gilbert Examples <!-- omit in toc -->

Are you interested in using Gilbert in your own project? Then take a look at the following examples (coming soon) to see how.

## Table of Contents <!-- omit in toc -->

- [Getting Started](#getting-started)
- [GitHub Repo as Template Source](#github-repo-as-template-source)
- [Local Developer Tool](#local-developer-tool)
- [Serverless Web Publisher to S3/CloudFront](#serverless-web-publisher-to-s3cloudfront)
- [Use Remote REST API to Create XML files on S3](#use-remote-rest-api-to-create-xml-files-on-s3)
- [Web Components](#web-components)

## Getting Started

This directory contains the sample site used in the [Getting Started](../README.md#quick-start) section of the root [README.md](../README.md).

## GitHub Repo as Template Source

This example shows how Gilbert can be used to generate a PWA using templates found in a GitHub repository.

## Local Developer Tool

This is a simplified version of the Gilbert CLI that illustrates how Gilbert can be leveraged in a custom build script.

## Serverless Web Publisher to S3/CloudFront

In this example Gilbert is deployed as an AWS Lambda function and triggered by a webhook from a headless CMS. The built artefacts are streamed to an S3 bucket behind CloudFront and then the CloudFront cache is invalidated. [Read more...](./serverless-web-publisher-to-s3-cloudfront/README.md)

## Use Remote REST API to Create XML files on S3

See how to fetch data from a remote REST API, combine with local templates to produce XML files and stream to AWS S3.

## Web Components

See how even a complex design system can be implemented with Gilbert.
