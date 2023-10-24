**Сканер балансов кошельков**

Для запуска:
1. создать `wallets.txt` в `wallets-scan/resource/config/walletsScan`
2. вставить кошельки
3. вызывать `npm install && npm run scanWallets` из командной строки
4. результат `balances.csv` будет в папке со скриптом

Из коробки поддерживаются следующие сети и их основные стейблы:
`Optimism, Arbitrum, Polygon, Avax, Bsc, Fantom, Celo, Gnosis, ZkSync, Linea, Base`
Для добавления своих сетей или токенов, а также ускорения работы скрипта см "Продвинутый запуск"

<details>
<summary><b>Продвинутый запуск</b></summary>
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
   Найти нужный `coinGeckoCoinId` можно
[тут](https://raw.githubusercontent.com/web3-toolkit/wallets-scan/main/resource/config/walletsScan/coingeckoSupportedTokens.csv?token=GHSAT0AAAAAACISRUWGDTFLKEJXYWX53LWQZJRUHYA)
   (первая колонка - id)
   
   Если нужна инфа только по нативному токену - `tokens` можно пропустить

   При создании `chainConfig.json`, [сети](https://github.com/web3-toolkit/wallets-scan/blob/main/src/walletsScan/chainConfigDefault.json) доступные по умолчанию, использоваться не будут.

Для ускорения работы
1. Создаем файл `.properties` в `wallets-scan/resource/config/walletsScan`
2. `ANKR_TOKEN=ankr token` - прописываем свой анкр токен для ускорения работы
3. `RPC_REQUESTS_PER_MINUTE=300` - сколько запросов в минуту можно делать своей рпц ( не анкр )
   
</details>
<details>
<summary><b>Работа с данными</b></summary>
Данные можно вставить в excel или google sheets для дальнейших манипуляций: фильтры, агрегация, графики и тд.

В качестве примера можно воспользоваться следующим [шаблоном](https://docs.google.com/spreadsheets/d/17dyfTRBBiwPJDBAllKANj5PCytkxXhZWxIEWNTJiE7w/edit?usp=sharing)

* Сохраняем его себе на гугл драйв
* Во вкладку "Исходные данные" вставляем результат работы скрипта. Тут можно отфильтровать по нужному блокчейну или токену.
Также данные из этой вкладки будут подтягивать остальные вкладки.
* Вкладка "Детектор пыли" - выставляем значение пыли, например 0.5.
Все монеты баланс которых в долларах будет меньше 0.5 в этой вкладке будут помечены как "пыль".
Удобно если надо быстро найти или исключить кошельки баланс которых ниже определенного значения.
* Вкладка - "$ стоимость" распределение балансов в $ по сетям.
</details>

**Обсудить / вопросы / пожелания**

https://t.me/web3_toolkit