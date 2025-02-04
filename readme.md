# json-to-index

NOTE: The official opensearch-cli can accomplish much of what this utility does, but requires install of their tool. This repository uses only HTTPS API Endpoints to interact with your cluster.

A utility for loading an array of timeseries JSON objects into an OpenSearch index.

Designed for ingesting files with JSON object arrays where each object represents a document.

When you run copy_and_ingest.sh, it is assumed that you already have a **datastream** index template created on your target cluster. A sample of an index template json definition is provided in this repository.

## Usage:
Some file preparation is required for this utility to work.

1. Make sure your target cluster has the index template created
2. Confirm your JSON objects are compliant with your index template, including timestamp format: `yyyyMMddTHHmmss.SSS`. A sample `formatDoc()` function is provided in index.ts. Feel free to customize.

When you're ready to index the documents, run the following commands:
```shell
npm install

cp sample.env .env

## update .env values
nano .env

bash ./copy_and_ingest.sh <indexName>
```

The script will provide a confirmation after every `_bulk` API request receives a response from the server.

Documents are batched into sets of 1000.


If your run errors or you need to re-run using the same data, you can re-use the temp file that was compiled by calling the script with:

```
bash ./copy_and_ingest.sh <indexName> <formattedFileName>
```
