import {formatEther, JsonRpcProvider} from "ethers";
import {createObjectCsvWriter} from 'csv-writer';
import {getProjectConfigFilePath, readLines, tokenBalance} from "../common/util.js";
import axios from "axios";
import * as _chainConfig from "./chainConfigDefault.json" assert {type: "json"};
import {CompoundRateLimiter} from "./compoundRateLimiter.js";
import PropertiesReader, {Value} from "properties-reader";
import fs from "fs";

interface Chain {
    name: string;
    rpcUrl: string;
    ankrRpcName?: string;
    coinGeckoCoinId: string;
    tokens?: {
        name: string;
        coinGeckoCoinId: string;
        contract: string;
    }[];
    isEnabled?: boolean;
    isTestNetwork?: boolean;
}

interface WalletScanConfig {
    ankrToken?: string;
    ankrRequestsPerMinute: number;
    defaultRequestsPerMinute: number;
}

const chainConfig: Chain[] = getChainsConfig();
const CONFIG = createConfig();

const AXIOS_INSTANCE = axios.create({
    validateStatus: () => true
});
const ANKR_URL = "https://rpc.ankr.com";
const ANKR_LIMITER = new CompoundRateLimiter(
    {tokensPerInterval: CONFIG.ankrRequestsPerMinute, interval: "minute"},
    {tokensPerInterval: 30, interval: "second"},
);
const DEFAULT_LIMITER = new CompoundRateLimiter(
    {tokensPerInterval: CONFIG.defaultRequestsPerMinute, interval: "minute"}
);
const TOKEN_NAMES_MAP = getTokenNamesMap();

const ID_TITLE = "Wallet Id";
const ADDRESS_TITLE = "Address";
const CHAIN_TITLE = "Chain";
const COIN_NAME_TITLE = "Coin name";
const COIN_AMOUNT_TITLE = "Coin amount";
const COIN_USD_VALUE_TITLE = "Coin $ value";
const COIN_CONTRACT_TITLE = "Coin contract";

(async () => {
    console.log(`Using config ${JSON.stringify(CONFIG)}`)
    const wallets = readLines(getProjectConfigFilePath("walletsScan", "wallets.txt"))
    const chains = getChains();
    const coinPrices = await getCoinPrices(chains);

    const rpcUrlToProvider = new Map<string, JsonRpcProvider>(chains.map(c => [c.rpcUrl, new JsonRpcProvider(c.rpcUrl)]));

    const csvData: any[] = [];
    const failedPromises: any[] = [];
    for (let i = 0; i < wallets.length; i++) {
        let id = i + 1;
        const walletAddress = wallets[i];
        console.log(`Processing ${id} wallet out of ${wallets.length} wallets`);
        const walletBalancePromises = createWalletBalancePromises(
            chains, rpcUrlToProvider, walletAddress, coinPrices, id
        );
        const settledPromises = await Promise.allSettled(walletBalancePromises);
        for (const promise of settledPromises) {
            if (promise.status === "fulfilled") {
                csvData.push(promise.value);
            } else {
                failedPromises.push(promise);
            }
        }
    }

    console.log(`Failed to process ${failedPromises.length} tokens`);

    await saveToCsv(csvData);
})();

function getChains() {
    const chains: Chain[] = chainConfig
        .filter(c => c.isEnabled || c.isEnabled === undefined)
        .map((item: Chain) => {
            if (item.ankrRpcName) {
                item.rpcUrl = createAnkrUrl(item.ankrRpcName);
            }
            if (!item.tokens) {
                item.tokens = [];
            }
            return item;
        });

    chains.forEach(item => {
        console.log("item.rpcUrl", item.rpcUrl);
    });
    return chains;
}

function getTokenNamesMap(): Map<string, string> {
    const filePath = getProjectConfigFilePath("walletsScan", "coingeckoSupportedTokens.csv");
    const result = new Map<string, string>();
    const lines = readLines(filePath).slice(1);
    for (const line of lines) {
        const row = line.split(",");
        result.set(row[0], row[2]);
    }
    return result;
}

function createWalletBalancePromises(chains: Chain[], rpcUrlToProvider: Map<string, JsonRpcProvider>, walletAddress: string, coinPrices: Map<string, number>, id: number) {
    const promises = [];
    for (const chain of chains) {
        const rpcProvider = rpcUrlToProvider.get(chain.rpcUrl)!;
        const nativeBalancePromise = createNativeBalancePromise(rpcProvider, walletAddress, coinPrices, chain, id);
        promises.push(nativeBalancePromise);
        for (const token of chain.tokens!) {
            const tokenPriceUsd = coinPrices.get(token.coinGeckoCoinId)!;
            const tokenBalancePromise = createTokenBalancePromise(
                rpcProvider, token.coinGeckoCoinId, token.contract, walletAddress, tokenPriceUsd, id, chain
            );
            promises.push(tokenBalancePromise);
        }
    }
    return promises;
}

function createNativeBalancePromise(rpcProvider: JsonRpcProvider, walletAddress: string, coinPrices: Map<string, number>, chain: Chain, id: number) {
    return getLimiter(chain.rpcUrl)
        .removeTokens(1)
        .then(() => rpcProvider.getBalance(walletAddress))
        .then((balance: bigint) => {
            const balanceFormatted = formatEther(balance);
            const balanceNumber = Number(balanceFormatted);
            const usdValue = coinPrices.get(chain.coinGeckoCoinId)! * balanceNumber;
            return createCsvRow(
                id, walletAddress, chain, chain.coinGeckoCoinId, "native", balanceNumber, usdValue
            );
        })
        .catch((e: Error) => {
            console.log(`Error in getting native balance ${walletAddress} for chain ${chain.name}`, e);
        });
}

function createTokenBalancePromise(rpcProvider: JsonRpcProvider, coinGeckoCoinId: string, tokenContract: string, walletAddress: string, tokenPriceUsd: number, id: number, chain: Chain) {
    return getLimiter(chain.rpcUrl)
        .removeTokens(1)
        .then(() => tokenBalance(rpcProvider, tokenContract, walletAddress))
        .then((balance: any) => {
            const balanceNumber = Number(balance.balanceFormatted);
            const usdValue = tokenPriceUsd * balanceNumber;
            return createCsvRow(
                id, walletAddress, chain, coinGeckoCoinId, tokenContract, balanceNumber, usdValue
            );
        })
        .catch((e: Error) => {
            console.log(`Error in getting token balance ${walletAddress} for ${chain.name}`, e);
        });
}

function getLimiter(rpcUrl: string): CompoundRateLimiter {
    return rpcUrl.includes(ANKR_URL) ? ANKR_LIMITER : DEFAULT_LIMITER
}

function createCsvRow(
    id: number, walletAddress: string, chain: Chain, coinGeckoCoinId: string,
    coinContract: string, balance: number, usdValue: number
) {
    const csvRow: { [key: string]: any } = {};
    csvRow[ID_TITLE] = id;
    csvRow[ADDRESS_TITLE] = walletAddress;
    csvRow[CHAIN_TITLE] = chain.name;
    csvRow[COIN_NAME_TITLE] = TOKEN_NAMES_MAP.get(coinGeckoCoinId);
    csvRow[COIN_AMOUNT_TITLE] = balance;
    csvRow[COIN_USD_VALUE_TITLE] = chain.isTestNetwork ? 0 : usdValue;
    csvRow[COIN_CONTRACT_TITLE] = coinContract;
    return csvRow;
}

async function getCoinPrices(chains: Chain[]): Promise<Map<string, number>> {
    const coinIds = new Set(chains.map(c => c.coinGeckoCoinId));
    chains.forEach(c => c.tokens!.forEach(s => coinIds.add(s.coinGeckoCoinId)));
    const config = {
        params: {ids: [...coinIds].join(","), vs_currencies: "usd"}
    };
    const response = await AXIOS_INSTANCE
        .get("https://api.coingecko.com/api/v3/simple/price", config);
    const result = new Map<string, number>();
    coinIds.forEach(i => result.set(i, response.data[i]["usd"]));
    return result;
}

function createAnkrUrl(chain: string): string {
    const token = CONFIG.ankrToken ? "/" + CONFIG.ankrToken : "";
    return `${ANKR_URL}/${chain}${token}`
}

async function saveToCsv(csvData: any[]) {
    const headers = [];
    headers.push({id: ID_TITLE, title: ID_TITLE});
    headers.push({id: ADDRESS_TITLE, title: ADDRESS_TITLE});
    headers.push({id: CHAIN_TITLE, title: CHAIN_TITLE});
    headers.push({id: COIN_NAME_TITLE, title: COIN_NAME_TITLE});
    headers.push({id: COIN_AMOUNT_TITLE, title: COIN_AMOUNT_TITLE});
    headers.push({id: COIN_USD_VALUE_TITLE, title: COIN_USD_VALUE_TITLE});
    headers.push({id: COIN_CONTRACT_TITLE, title: COIN_CONTRACT_TITLE});

    const csvWriter = createObjectCsvWriter({
        path: 'balances.csv',
        header: headers
    });

    const csvDataSorted = csvData.sort((a, b) => {
        return a[ID_TITLE] - b[ID_TITLE] ||
            a[CHAIN_TITLE].localeCompare(b[CHAIN_TITLE]) ||
            a[COIN_NAME_TITLE].localeCompare(b[COIN_NAME_TITLE]) ||
            b[COIN_USD_VALUE_TITLE] - a[COIN_USD_VALUE_TITLE]
    });
    await csvWriter.writeRecords(csvDataSorted)
        .then(() => console.log('CSV file was written successfully.'));
}

function getChainsConfig(): Chain[] {
    const chainConfigFilePath = getProjectConfigFilePath("walletsScan", "chainConfig.json");
    if (fs.existsSync(chainConfigFilePath)) {
        const data = fs.readFileSync(chainConfigFilePath);
        return JSON.parse(data.toString());
    }
    return (_chainConfig as any).default;
}

function createConfig(): WalletScanConfig {
    const configFilePath = getProjectConfigFilePath("walletsScan", ".properties");
    let ankrToken;
    let ankrRequestsPerMinute = 300;
    let defaultReqeustsPerMinute: Value | null = 300;
    if (fs.existsSync(configFilePath)) {
        const properties = PropertiesReader(configFilePath);
        ankrToken = properties.get("ANKR_TOKEN");
        ankrRequestsPerMinute = 1000;
        defaultReqeustsPerMinute = properties.get("RPC_REQUESTS_PER_MINUTE")
    }
    return {
        ankrToken: ankrToken,
        ankrRequestsPerMinute: ankrRequestsPerMinute,
        defaultRequestsPerMinute: defaultReqeustsPerMinute
    } as WalletScanConfig;
}