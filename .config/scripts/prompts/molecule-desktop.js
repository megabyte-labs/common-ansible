import inquirer from 'inquirer'
import signale from 'signale'
import { decorateSystem } from './lib/decorate-system.js'

/**
 * Prompts the user for the operating system they wish to launch and test the
 * Ansible play against.
 *
 * @returns {string} The operating system string, lowercased
 */
async function promptForDesktop() {
  const choices = ['Archlinux', 'CentOS', 'Debian', 'Fedora', 'macOS', 'Ubuntu', 'Windows']
  const choicesDecorated = choices.map((choice) => decorateSystem(choice))
  const response = await inquirer.prompt([
    {
      choices: choicesDecorated,
      message: 'Which desktop operating system would you like to test the Ansible play against?',
      name: 'operatingSystem',
      type: 'list'
    }
  ])

  return response.operatingSystem.replace('● ', '').toLowerCase()
}

/**
 * Main script logic
 */
async function run() {
  signale.info(
    'Choose a desktop environment below to run the Ansible play on.' +
      ' After choosing, a VirtualBox VM will be created. Then, the Ansible play will run on the VM.' +
      ' After it is done, the VM will be left open for inspection. Please do get carried away' +
      ' ensuring everything is working as expected and looking for configuration optimizations that' +
      ' can be made. The operating systems should all be the latest stable release but might not always' +
      ' be the latest version.'
  )
  const environment = await promptForDesktop()
  // eslint-disable-next-line no-console
  console.log(environment)
}

run()
