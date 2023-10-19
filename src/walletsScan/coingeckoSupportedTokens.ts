import axios from "axios";
import {getProjectConfigFilePath} from "../common/util.js";
import {createObjectCsvWriter} from "csv-writer";

const COIN_ID_TITLE = "Coin id";
const COIN_NAME_TITLE = "Coin name";
const COIN_SYMBOL_TITLE = "Coin symbol";

const AXIOS_INSTANCE = axios.create();

const tokensResponse = await AXIOS_INSTANCE.get("https://api.coingecko.com/api/v3/coins/list");

const headers = [];
headers.push({id: COIN_ID_TITLE, title: COIN_ID_TITLE});
headers.push({id: COIN_NAME_TITLE, title: COIN_NAME_TITLE});
headers.push({id: COIN_SYMBOL_TITLE, title: COIN_SYMBOL_TITLE});

const csvData: any[] = [];

for (const token of tokensResponse.data) {
    const csvRow: { [key: string]: any } = {};
    csvRow[COIN_ID_TITLE] = token["id"];
    csvRow[COIN_NAME_TITLE] = token["name"];
    csvRow[COIN_SYMBOL_TITLE] = token["symbol"];
    csvData.push(csvRow);
}

const filePath = getProjectConfigFilePath("walletsScan", "coingeckoSupportedTokens.csv");

const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers
});

await csvWriter.writeRecords(csvData);