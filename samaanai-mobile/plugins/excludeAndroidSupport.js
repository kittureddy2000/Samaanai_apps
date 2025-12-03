/**
 * Expo Config Plugin to exclude old Android Support libraries
 * This fixes duplicate class errors between androidx and android.support
 */

const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function excludeAndroidSupport(config) {
  return withAppBuildGradle(config, (config) => {
    // Add exclusions to dependencies block
    const exclusions = `
    configurations.all {
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'support-core-utils'
        exclude group: 'com.android.support', module: 'support-core-ui'
        exclude group: 'com.android.support', module: 'support-fragment'
        exclude group: 'com.android.support', module: 'versionedparcelable'
    }
`;

    // Insert exclusions before dependencies block
    if (!config.modResults.contents.includes('exclude group: \'com.android.support\'')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*{/,
        `${exclusions}\ndependencies {`
      );
    }

    return config;
  });
};
