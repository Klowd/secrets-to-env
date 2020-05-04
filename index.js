#!/usr/bin/env node

"use strict";

const AWS = require("aws-sdk/global");
const debug = require("debug");
const fs = require("fs");
const moment = require("moment");

const secretsmanager = require("aws-sdk/clients/secretsmanager");

AWS.config.logger = console;

const init = async () => {
  try {
    const secretsManagerClient = new secretsmanager({
      region: process.env.AWS_DEFAULT_REGION || "us-west-2",
    });
    const response = await secretsManagerClient
      .getSecretValue({
        SecretId: process.env.AWS_SECRETSMANAGER_SECRET_ID,
      })
      .promise();
    const secrets = JSON.parse(response.SecretString);
    let EnvString = `\n########## Retrieved ${moment().format(
      "llll"
    )} UTC ##########\n`;
    if (secrets) {
      for (const [key, value] of Object.entries(secrets)) {
        if (key === "REACT_APP_API_HOST") {
          EnvString += `${key}="http://localhost:${process.env.PORT - 1}"\n`;
          continue;
        }
        EnvString += `${key}="${value}"\n`;
      }
    }
    EnvString += "\n";
    fs.writeFile(".env", EnvString, { flag: "a" }, (err) => {
      if (err) throw err;
      debug("secrets-to-env:info")("✅ The .env file has been written!");
    });
  } catch (err) {
    debug("secrets-to-env:error")(
      "Refresh-Env#init():",
      "Initialization failed in the refresh-env.js script.",
      err.stack
    );
  }
};
init();
