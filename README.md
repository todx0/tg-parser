# Telegram Chats Parser Bot

## Overview

This repository serves no real purpose and is done purely to study about Telegram API
and what user information can be scrapped from public chats.

## Features

- **Get user's chats names mapped to its id**: `/map`
- **Analyze messages over a specific number of days**: `/scan_days {chatId} {days}`
- **Analyze a specific number of messages**: `/scan_limit {chatId} {limit}`
- **Generate word trend graphs**: `/graph {chatId}`

## Installation

### Prerequisites

- [Bun](https://bun.sh/docs/installation)

### Clone the Repository

```sh
git clone <repository-url>
cd parser
```

### Install Dependencies

```sh
bun install
```

### Generate required API keys
- Rename `.env.example` to `.env`
- Generate API_ID and API_HASH [here](https://gram.js.org/getting-started/authorization#getting-api-id-and-api-hash)
- Generate SESSION key [Learn how](https://gram.js.org/getting-started/authorization) or run `bun session.js`

### (Optional)
- Add necessary word filters to `filter.txt`

## Usage

Run the bot with:

```sh
bun start
```

## Commands

### `/map`

Retrieves a JSON object mapping chat IDs to their respective group names.

### `/scan_days {chatId} {days}`

Scans messages from the last `{days}` days in the specified `{chatId}` and stores word frequency data in the database.

### `/scan_limit {chatId} {limit}`

Scans the last `{limit}` messages from `{chatId}` and generates a word frequency table. The results are sent as an image.

### `/graph {chatId}`

Required after `scan_days` command. Generates a trend graph based on stored word frequency data for `{chatId}` and sends it as an image.

## Dependencies

- [**Bun**](https://bun.sh/) – Runtime
- [**Telegram**](https://www.npmjs.com/package/telegram) – Telegram API integration
- [**node-html-to-image**](https://www.npmjs.com/package/node-html-to-image) – Generates word trend images from HTML tables
- [**@biomejs/biome**](https://www.npmjs.com/package/@biomejs/biome) – Linting and formatting
