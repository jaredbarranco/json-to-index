#! /usr/local/bin/bash

INPUT_DIR=""
INDEX_NAME="$1"
if [[ -z $INDEX_NAME ]]; then
	echo "Provide target index name as first parameter to this script"
	exit;
fi

FILE_NAME="$2"
WORK_DIR=$(pwd)

## If the user provided a compiled file, use that, don't create a new one
if [[ -z $FILE_NAME ]]; then
	echo "No filename provided, create new temp file"
	TMP_FILE=$(mktemp)
	TMP_AGG_FILE=$TMP_FILE
	if [ -d "$WORK_DIR"/files_in ]; then
		for file in "$WORK_DIR"/files_in/*; do
		  if [ -f "$file" ]; then  # Check if it's a regular file
			# echo "Appending $file to $TMP_AGG_FILE"
			cat $file | jq -c '.[]' >> $TMP_AGG_FILE
		  fi
		done
		echo "Successfully compiled script input. Save the below temp file for future runs:"
		echo "$TMP_AGG_FILE"
		echo ""
	else
		echo "./files_in directory not found! Create it and put your json files in there!"
		exit;
	fi
else
	echo "Filename provided, use existing file: $FILE_NAME"
	TMP_AGG_FILE=$FILE_NAME
fi

# cat $TMP_AGG_FILE | less
echo "Build the ts file"
tsc index.ts
echo "Run the js file"
node index.js "$INDEX_NAME" "$TMP_AGG_FILE"

echo ""
echo "Script Complete, view or delete the agg file:"
echo "$TMP_AGG_FILE"
