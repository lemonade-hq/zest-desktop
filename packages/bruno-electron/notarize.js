require('dotenv').config({ path: process.env.DOTENV_PATH });
const fs = require('fs');
const path = require('path');
const electron_notarize = require('electron-notarize');

const notarize = async function (params) {
  if (process.platform !== 'darwin') {
    return;
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_TEAM_ID) {
    console.log('APPLE_ID / APPLE_TEAM_ID not set, skipping notarization');
    return;
  }

  let appId = 'com.lemonade.zest';

  let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    console.error(`Cannot find application at: ${appPath}`);
    return;
  }

  console.log(`Notarizing ${appId} found at ${appPath} using Apple ID ${process.env.APPLE_ID}`);
  const teamId = process.env.APPLE_TEAM_ID;
  try {
    await electron_notarize.notarize({
      tool: 'notarytool',
      appBundleId: appId,
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      ascProvider: teamId,
      teamId: teamId
    });
  } catch (error) {
    console.error(error);
  }

  console.log(`Done notarizing ${appPath}`);
};

module.exports = notarize;
