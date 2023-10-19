**Сканер балансов кошельков**

Для запуска:
1. создать `wallets.txt` в `wallets-scan/resource/config/walletsScan`
2. вставить кошельки
3. вызывать `npm install && npm run scanWallets` из командной строки
4. результат будет в `balances.csv`

Из коробки поддерживаются следующие сети и их основные стейблы:
`Optimism, Arbitrum, Polygon, Avax, Bsc, Fantom, Celo, Gnosis, ZkSync`
Для добавления своих сетей или токенов, а также ускорения работы скрипта см "Продвинутый запуск"

<details>
<summary>Продвинутый запуск</summary>
Для добавления своих сетей

1. Создаем `chainConfig.json` в `wallets-scan/resource/config/walletsScan`. Пример структуры файла можно посмотреть [тут](https://github.com/web3-toolkit/wallets-scan/blob/main/src/walletsScan/chainConfigDefault.json).
2. Добавить нужные сети. Каждая отдельная сеть будет представлять из себя следующий блок:
   ```
    {
    "name": "Название сети",
    "rpcUrl": "Рпц сети",
    "ankrRpcName": "[Опционально] айди сети в анкр. Если указано, будет использоваться анкр рпц. rpcUrl будет в этом случае игнорироваться.",
    "coinGeckoCoinId": "Coin gecko id нативного токена для получения стоимости в $.",
    "tokens": [
      {
        "name": "Свое название монеты",
        "coinGeckoCoinId": "Coin gecko id своего токена для получения стоимости в $.",
        "contract": "Контракт своего токена"
      },
      {
        "name": "Второй токен",
        "coinGeckoCoinId": "...",
        "contract": "..."
      }
    ],
    "isEnabled": "[опционально] true | false - если нужно выключить эту сеть ставим false, по умолчанию включена",
    "isTestNetwork": "[опционально] true | false - ставим true если это тестовая сеть и мы хотим считать значение в $ = 0"
   }
   ```
   Найти нужный `coinGeckoCoinId` можно [тут](https://github.com/web3-toolkit/wallets-scan/blob/main/resource/config/walletsScan/coingeckoSupportedTokens.csv)
   
   Если нужна инфа только по нативному токену `tokens` можно пропустить

   При создании `chainConfig.json` [сети](https://github.com/web3-toolkit/wallets-scan/blob/main/src/walletsScan/chainConfigDefault.json) по умолчанию не будут использоваться.

Для ускорения работы
1. Создаем файл `.properties` в `wallets-scan/resource/config/walletsScan`
2. `ANKR_TOKEN=ankr token` - прописываем свой анкр токен для ускорения работы
3. `RPC_REQUESTS_PER_MINUTE=300` - сколько запросов в минуту можно делать своей рпц ( не анкр )
   
</details>