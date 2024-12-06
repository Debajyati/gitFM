import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function executeCommand(command, args = []) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args);
    if (stderr) {
      const { default: chalk } = await import('chalk');
      console.log(chalk.yellowBright(stderr));
    }
    // console.log(`stdout: ${stdout}`);
    return stdout;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

async function runShallowClone(repoUrl, dirName='', branch='') {
  try {
    if (!dirName) {
      dirName = repoUrl.split('/').pop().replace(/\.git$/, '') || 'default-repo';
    }
    if (!branch) {
      await executeCommand('git', ['clone', '--depth', '1', repoUrl, dirName]);
    } else {
      await executeCommand('git', ['clone', '--depth', '1', '--single-branch', '-b', branch, repoUrl, dirName]);
    }
    console.log('Shallow cloning completed successfully!');
  } catch (error) {
    console.error(`Error during shallow clone process: ${error.message}`);
    process.exit(1);
  }
}

async function runBloblessClone(repoUrl, dirName='', branch='') {
  try {
    if (!dirName) {
      dirName = repoUrl.split('/').pop().replace(/\.git$/, '') || 'default-repo';
    }
    if (!branch) {
      await executeCommand('git', ['clone', '--filter=blob:none', repoUrl, dirName]);
    } else {
      await executeCommand('git', ['clone', '--filter=blob:none', '--single-branch', '-b', branch, repoUrl, dirName]);
    }
    console.log('Blobless cloning completed successfully!');
  } catch (error) {
    console.error(`Error during blobless clone process: ${error.message}`);
    process.exit(1);
  }
}

async function runTreelessClone(repoUrl, dirName = '', branch = '') {
  try {
    if (!dirName) {
      dirName = repoUrl.split('/').pop().replace(/\.git$/, '') || 'default-repo';
    }
    if (!branch) {
      await executeCommand('git', ['clone', '--no-checkout', '--filter=tree:0', repoUrl, dirName]);
    } else {
      await executeCommand('git', ['clone', '--no-checkout', '--filter=tree:0', '--single-branch', '-b', branch, repoUrl, dirName]);
    }
    console.log('Treeless cloning completed successfully!');
  } catch (error) {
    console.error(`Error during treeless clone process: ${error.message}`);
    process.exit(1);
  }
}

async function runSparseCheckout(repoUrl, dirName = '', branch = '', pathToDirectory, noCone=true) {
  try {
    // Validate inputs
    if (!pathToDirectory) {
      throw new Error('Path to directory for sparse checkout cannot be empty.');
    }

    if (!dirName) {
      dirName = repoUrl.split('/').pop().replace(/\.git$/, '') || 'default-repo';
    }

    const cloneArgs = ['clone', '--no-checkout', '--filter=blob:none'];
    // if (branch) cloneArgs.push('-b', branch);
    cloneArgs.push(repoUrl, dirName);

    await executeCommand('git', cloneArgs);

    // Change to cloned directory
    process.chdir(dirName);

    // Initialize sparse-checkout
    const sparseAddDirArgs = ['sparse-checkout', 'add'];
    if (noCone) {
      await executeCommand('git', ['sparse-checkout', 'set', '--no-cone']);
      sparseAddDirArgs.push('!/*');
    } else {
      await executeCommand('git', ['sparse-checkout', 'set', '--cone']);
    }

    if (pathToDirectory.constructor === Array) {
      await executeCommand('git', [...sparseAddDirArgs, ...pathToDirectory]);
    } else {
      await executeCommand('git', [...sparseAddDirArgs, pathToDirectory]);
    }

    // Determine default branch if not provided
    const branchList = (await executeCommand('git', ['ls-remote', '--sort=-committerdate', '--heads', 'origin']))
    .split('\n')
    .map(line => line.split('\t').pop().replace('refs/heads/', '').trim());
    const defaultLocalBranch = branch || branchList[0] || 'main';

    // Checkout branch
    await executeCommand('git', ['checkout', defaultLocalBranch]);
    console.log('Cloning specific directory completed successfully!');
  } catch (error) {
    console.error('Error during sparse checkout process:', error.message || error);
    process.exit(1);
  }
}

async function normalClone(repoUrl, dirName='', branch='') {
  try {
    const cloneArgs = ['clone', repoUrl];
    if (branch) cloneArgs.push('--single-branch', '--branch', branch);
    if (dirName) cloneArgs.push(dirName);
    await executeCommand('git', cloneArgs);
    console.log('Cloning completed successfully!');
  } catch (error) {
    console.error(`Error during cloning process: ${error.message}`);
    process.exit(1);
  }
}

export {
  executeCommand,
  runSparseCheckout,
  normalClone,
  runShallowClone,
  runBloblessClone,
  runTreelessClone,
}
