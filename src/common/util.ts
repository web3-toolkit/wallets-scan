import fs from "fs";
import path from "path";
import {Contract, formatUnits, Provider} from "ethers";
import {InterfaceAbi} from "ethers/lib.commonjs/abi/interface";
import {createRequire} from "module";
const require = createRequire(import.meta.url);

const ERC_20_ABI = require("./erc20Abi.json") as InterfaceAbi;

export function readLines(filePath: string): string[] {
  const file = fs.readFileSync(filePath, 'utf-8');
  return file.split(/\r?\n/);
}

export function getProjectConfigFilePath(project: string, file: string) {
  return getProjectConfigPath(project) + path.sep + file;
}

export function getProjectConfigPath(project: string) {
  return [process.cwd(), "resource", "config", project].join(path.sep)
}

export async function tokenBalance(web3: Provider, tokenAddress: string, walletAddress: string)
    : Promise<{ balance: number, balanceFormatted: string }> {
  const tokenContract = new Contract(tokenAddress, ERC_20_ABI, web3);
  const decimals = await tokenContract.decimals();
  const balance = await tokenContract.balanceOf(walletAddress);
  return {
    balance: balance,
    balanceFormatted: formatUnits(balance, decimals)
  }
}