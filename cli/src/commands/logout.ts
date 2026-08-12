import { deleteConfig, configPath } from '../config.js';
import { success, info, dim } from '../ui.js';

export function logoutCommand() {
  const removed = deleteConfig();
  if (removed) {
    success(`Removed ${dim(configPath())}`);
  } else {
    info('Not signed in.');
  }
}
