require('dotenv').config({ path: process.env.DOTENV_PATH });

const isBenchmark = process.env.BRUNO_BENCHMARK === 'true';

// Zest: CI narrows the macOS build (e.g. ZEST_MAC_TARGETS=dmg ZEST_MAC_ARCH=arm64).
// Unset, this is the full upstream matrix.
const macTargets = (process.env.ZEST_MAC_TARGETS || 'pkg,dmg,zip').split(',');
const macArch = (process.env.ZEST_MAC_ARCH || 'x64,arm64').split(',');

const config = {
  appId: 'com.lemonade.zest',
  productName: isBenchmark ? 'Zest Benchmark' : 'Zest',
  extraMetadata: {
    brunoBuild: {
      benchmark: isBenchmark,
      builtAt: new Date().toISOString()
    }
  },
  electronVersion: '37.6.1',
  directories: {
    buildResources: 'resources',
    output: 'out'
  },
  extraResources: [
    {
      from: 'resources/data/sample-collection.json',
      to: 'data/sample-collection.json'
    },
    {
      from: 'resources/data/zest',
      to: 'data/zest'
    }
  ],
  files: ['**/*'],
  afterSign: 'notarize.js',
  mac: {
    artifactName: '${name}_${version}_${arch}_${os}.${ext}',
    category: 'public.app-category.developer-tools',
    target: macTargets.map((target) => ({ target, arch: macArch })),
    icon: 'resources/icons/mac/icon.icns',
    hardenedRuntime: true,
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist',
    notarize: false,
    protocols: [
      {
        name: 'Zest',
        schemes: [
          'bruno'
        ]
      }
    ]
  },
  linux: {
    artifactName: '${name}_${version}_${arch}_${os}.${ext}',
    icon: 'resources/icons/png',
    target: [
      {
        target: 'AppImage',
        arch: ['x64', 'arm64']
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64']
      },
      {
        target: 'rpm',
        arch: ['x64', 'arm64']
      }
    ],
    protocols: [
      {
        name: 'Zest',
        schemes: ['bruno']
      }
    ],
    category: 'Development',
    desktop: {
      MimeType: 'x-scheme-handler/bruno;'
    }
  },
  deb: {
    // Docs: https://www.electron.build/configuration/linux#debian-package-options
    depends: [
      'libgtk-3-0',
      'libnotify4',
      'libnss3',
      'libxss1',
      'libxtst6',
      'xdg-utils',
      'libatspi2.0-0',
      'libuuid1',
      'libsecret-1-0',
      'libasound2' // #1036
    ]
  },
  // Bundle git so Snap/sandbox installs can find it (#5667)
  snap: {
    stagePackages: ['default', 'git'],
    // electron-builder's app part strips usr/bin, so expose git from git-core
    environment: {
      PATH: '$SNAP/usr/lib/git-core:$SNAP/usr/sbin:$SNAP/usr/bin:$SNAP/sbin:$SNAP/bin:$PATH',
      GIT_EXEC_PATH: '$SNAP/usr/lib/git-core'
    }
  },
  win: {
    artifactName: '${name}_${version}_${arch}_win.${ext}',
    icon: 'resources/icons/win/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'arm64']
      }
    ],
    sign: null,
    publisherName: 'Bruno Software Inc'
  },
  nsis: {
    include: 'resources/installer.nsh',
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  pkg: {
    installLocation: '/Applications',
    isRelocatable: false
  }
};

module.exports = config;
