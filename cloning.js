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

async function runShallowClone(repoUrl, branchName='', dirName='') {
  try {
    if (!branchName) {
      await executeCommand('git', ['clone', '--depth', '1', repoUrl, dirName]);
    } else {
      await executeCommand('git', ['clone', '--depth', '1', '-b', branchName, repoUrl, dirName]);
    }
    console.log('Shallow cloning completed successfully!');
  } catch (error) {
    console.error(`Error during shallow clone process: ${error.message}`);
    process.exit(1);
  }
}

async function runBloblessClone(repoUrl, branchName='', dirName='') {
  try {
    if (!branchName) {
      await executeCommand('git', ['clone', '--filter=blob:none', repoUrl, dirName]);
    } else {
      await executeCommand('git', ['clone', '--filter=blob:none', '-b', branchName, repoUrl, dirName]);
    }
    console.log('Blobless cloning completed successfully!');
  } catch (error) {
    console.error(`Error during blobless clone process: ${error.message}`);
    process.exit(1);
  }
}

async function runSparseCheckout(repoUrl, dirName = '', branch = '', pathToDirectory) {
  try {
    // Validate inputs
    if (!pathToDirectory) {
      throw new Error('Path to directory for sparse checkout cannot be empty.');
    }

    // Derive default directory name if dirName is not provided
    if (!dirName) {
      dirName = repoUrl.split('/').pop().replace(/\.git$/, '') || 'default-repo';
    }

    // Determine git clone command based on inputs
    const cloneArgs = ['clone', '--no-checkout', '--filter=blob:none'];
    if (branch) cloneArgs.push('-b', branch);
    cloneArgs.push(repoUrl, dirName);

    // Execute git clone
    await executeCommand('git', cloneArgs);

    // Change to cloned directory
    process.chdir(dirName);

    // Initialize sparse-checkout
    await executeCommand('git', ['sparse-checkout', 'set', '--no-cone']);
    await executeCommand('git', ['sparse-checkout', 'add', '!/*', pathToDirectory]);

    // Determine default branch if not provided
    const branchList = (await executeCommand('git', ['ls-remote', '--heads', 'origin']))
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

async function normalClone(repoUrl, dirName='') {
  try {
    await executeCommand('git', ['clone', repoUrl, dirName]);
    console.log('Cloning completed successfully!');
  } catch (error) {
    console.error(`Error during cloning process: ${error.message}`);
    process.exit(1);
  }
}

export {
  runSparseCheckout,
  normalClone,
  runShallowClone,
  runBloblessClone,
}