import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { projectsCommand } from './commands/projects.js';
import { deployCommand } from './commands/deploy.js';

const program = new Command();

program
  .name('pushdeck')
  .description('CLI for rn-pushdeck — ship JS updates to React Native apps.')
  .version('0.2.2', '-V, --cli-version', 'Show CLI version');

program
  .command('login')
  .description('Save an API token for future commands.')
  .option('-t, --token <token>', 'Token value (or paste interactively)')
  .option('--api-url <url>', 'Override the API URL')
  .action((opts) => loginCommand(opts));

program
  .command('logout')
  .description('Remove the saved token.')
  .action(() => logoutCommand());

program
  .command('whoami')
  .description('Verify the saved token works.')
  .action(() => whoamiCommand());

program
  .command('projects')
  .description('List your projects and current versions.')
  .action(() => projectsCommand());

program
  .command('deploy')
  .description('Upload a bundle and (optionally) promote it to a channel.')
  .requiredOption('-p, --project <key-or-id>', 'Project key (psh_...) or UUID')
  .requiredOption('-v, --version <semver>', 'Bundle version, e.g. 1.0.1')
  .requiredOption('-b, --bundle <path>', 'Path to the JS bundle file')
  .option('-a, --assets <path>', 'Path to the assets zip')
  .option('--min-native <semver>', 'Minimum native APK version (default: --version)')
  .option('--notes <text>', 'Release notes')
  .option('--promote <channel>', 'Promote to this channel after upload')
  .action((opts) => deployCommand(opts));

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
