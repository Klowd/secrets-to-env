#!/usr/bin/env node

"use strict";

const AWS = require("aws-sdk/global");
const debug = require("debug");
const fs = require("fs");
const moment = require("moment");

const secretsmanager = require("aws-sdk/clients/secretsmanager");
const s3 = require("aws-sdk/clients/s3");

AWS.config.logger = console;

const fetchOverlordConfigValues = async (currentEnvironment) => {
  try {
    const s3Client = new s3({
      region: process.env.AWS_DEFAULT_REGION || "us-west-2",
    });

    const eventNameAbbr = process.env.AWS_SECRETSMANAGER_SECRET_ID.split(
      "-"
    )[1];

    const { Body } = await s3Client
      .getObject({
        Bucket: `onlineeventpro-content-${currentEnvironment}`,
        Key: `onlineeventpro-${eventNameAbbr}-api/ui-build-config.json`,
      })
      .promise();

    const overlordUIBuildConfig = JSON.parse(Body);

    return overlordUIBuildConfig;
  } catch (err) {
    debug("secrets-to-env:error")(
      "Failed in the fetchOverlordConfigValues() function:",
      err.message
    );
    return null;
  }
};

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

    const overlordConfigValues = await fetchOverlordConfigValues(
      secrets.REACT_APP_ENV
    );

    let successMessage = "✅ The .env file has been written!";

    if (overlordConfigValues) {
      EnvString += `\n########## Overlord config build values ##########\n`;

      for (let [key, value] of Object.entries(overlordConfigValues)) {
        const formattedKey = key
          .split(/(?=[A-Z])/) // camelCase to UPPER_SNAKE_CASE
          .map((fragment) => fragment.toUpperCase())
          .join("_");
        process.env[formattedKey] = value;

        EnvString += `REACT_APP_${formattedKey}="${value}"\n`;
      }
      successMessage = `✅ Overlord UI build config values has been added! \n${successMessage}`;
    }

    fs.writeFile(".env", EnvString, { flag: "a" }, (err) => {
      if (err) throw err;
      debug("secrets-to-env:info")(successMessage);
    });
  } catch (err) {
    debug("secrets-to-env:error")("Failed in the init() function:", err.stack);
  }
};
init();
