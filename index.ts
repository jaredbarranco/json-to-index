import { Client, ClientOptions } from '@opensearch-project/opensearch';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import objectHash = require("object-hash")
import { config as dotenvConfig } from 'dotenv'

dotenvConfig();
const config: osConfig = {
	osHostName: process.env.OS_HOST || 'https://localhost:9200',
	osUser: process.env.OS_USER || 'admin',
	osPass: process.env.OS_PASS,
}
interface osConfig {
	osHostName: string;
	osUser: string;
	osPass: string;
};


const MAX_BULK_SIZE = 1000; // Maximum numbr of documents per bulk request

async function main(indexName: string, inputFilename: string, osPass: string) {
	try {
		// Validate required env var
		console.log(config)
		if (!config.osPass && !osPass) {
			throw Error('No OpenSearch Cluster Password Provided!');
		};
		// Validate the file exists and is readable
		const filePath = path.resolve(inputFilename);
		await fs.promises.access(filePath); // Throws if file is not accessible

		// Create OpenSearch Client
		const options: ClientOptions = {
			node: config.osHostName, // Replace with your OpenSearch node
			auth: {
				username: config.osUser, // Replace with your username
				password: config.osPass || osPass  // Replace with your password
			},
			ssl: {
				rejectUnauthorized: false
			}
		};

		const client = new Client(options);

		// Create a read stream and a readline interface
		const fileStream = fs.createReadStream(filePath);
		const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
		console.log(`Indexing data from ${filePath} into index ${indexName}`)
		const bulkPayload: any[] = [];
		let lineCount = 0;
		for await (const line of rl) {
			const doc = JSON.parse(line);
			bulkPayload.push({ create: { _index: indexName, _id: objectHash(doc) } });
			bulkPayload.push(formatDoc(doc));
			lineCount++;
			// If bulkPayload reaches the maximum size, send it to OpenSearch
			if (bulkPayload.length / 2 >= MAX_BULK_SIZE) {
				console.log("Send bulk request");
				await sendBulkRequest(client, bulkPayload);
				bulkPayload.length = 0; // Clear the bulkPayload array
			}
		}

		// Send any remaining documents
		if (bulkPayload.length > 0) {
			await sendBulkRequest(client, bulkPayload);
		}

		console.log(`Processed ${lineCount} documents successfully.`);
	} catch (error) {
		//@ts-ignore
		console.error('An error occurred:', error.message);
	}
}

function formatDoc(doc: object) {

	// const curTime: string = doc["@timestamp"]
	// const isoTime: string = curTime.split(" ")[0] + 'T' + curTime.split(" ")[1];
	//
	// delete doc["@timestamp"]
	// doc["@timestamp"] = isoTime;
	return doc;
};

async function sendBulkRequest(client: Client, bulkPayload: any[]) {
	try {
		const response = await client.bulk({
			refresh: true,
			body: bulkPayload
		});
		// Handle errors in the response
		if (response.body.errors) {
			console.log(response.body.items[0])
			const errorItems = response.body.items//.filter((item: any) => item.create.status !== 200);
				.map((item: any, idx: number) => ({ ...item.create, idx }))
				.filter((item: any) => item.status !== 200);

			// console.error('Errors occurred during bulk indexing:', errorItems[0]);
			for (const errorItem of errorItems) {
				if (errorItem.status === 409) {
					console.log(`Duplicate document rejected by OpenSearch with id: ${errorItem._id}`)
				} else {
					//@ts-ignore
					console.error(`Index: ${errorItem.idx}, Error: ${JSON.stringify(errorItem.error)}`);
				}
			}
		} else {
			console.log('Bulk indexing completed successfully for current batch.');
		}
	} catch (error) {
		console.log(error)
		console.error('Error during bulk request:', error.message);
	}
}

const [indexName, inputFilename, osPass] = process.argv.slice(2);
console.log(`Received index: ${indexName}, and input file: ${inputFilename}, and osPass: ${osPass}`)
if (!indexName && !inputFilename && !osPass) {
	console.error('Usage: ts-node script.ts <indexName> <inputFilename>');
	process.exit(1);
}
main(indexName, inputFilename, osPass);

