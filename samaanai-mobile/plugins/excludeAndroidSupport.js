/**
 * Expo Config Plugin to exclude old Android Support libraries
 * This fixes duplicate class errors between androidx and android.support
 */

const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function excludeAndroidSupport(config) {
  // Modify app-level build.gradle
  config = withAppBuildGradle(config, (config) => {
    const exclusions = `
configurations.all {
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-core-ui'
    exclude group: 'com.android.support', module: 'support-fragment'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'versionedparcelable'
}

configurations.all {
    resolutionStrategy {
        force 'androidx.core:core:1.13.1'
        force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
    }
}
`;

    // Insert exclusions at the top of the file, after apply plugin
    if (!config.modResults.contents.includes('exclude group: \'com.android.support\'')) {
      config.modResults.contents = config.modResults.contents.replace(
        /(apply plugin.*\n)/,
        `$1\n${exclusions}\n`
      );
    }

    return config;
  });

  // Also modify project-level build.gradle for global effect
  config = withProjectBuildGradle(config, (config) => {
    const globalExclusions = `
subprojects {
    configurations.all {
        exclude group: 'com.android.support'
    }
}
`;

    if (!config.modResults.contents.includes('exclude group: \'com.android.support\'')) {
      // Add at the end of the file
      config.modResults.contents = config.modResults.contents + '\n' + globalExclusions;
    }

    return config;
  });

  return config;
};
