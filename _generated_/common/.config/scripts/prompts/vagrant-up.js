/* eslint-disable functional/immutable-data, fp/no-mutating-methods, jsdoc/require-returns-type */

import inquirer from 'inquirer'
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import signale from 'signale'
import { decorateSystem } from './lib/decorate-system'

const platformMap = {
  'Hyper-V': 'hyperv',
  KVM: 'libvirt',
  Parallels: 'parallels',
  'VMWare Fusion': 'vmware_fusion',
  'VMWare Workstation': 'vmware_workstation',
  VirtualBox: 'virtualbox'
}

const options = {
  stdio: 'ignore'
}

const optionsPowerShell = {
  shell: 'powershell.exe',
  stdio: 'ignore'
}

/**
 * Executes a command synchronously via the terminal shell
 *
 * @param {*} cmd - Command to execute
 * @returns Status code from the command executed
 */
const exec = (cmd) => execSync(cmd, options)

/**
 * Executes a command synchronously via PowerShell
 *
 * @param {*} cmd - Command to execute on PowerShell
 * @returns Status code from the command executed
 */
const execPowerShell = (cmd) => execSync(cmd, optionsPowerShell)

/**
 * Checks if a program is installed
 *
 * @param {*} program - Program to check
 * @returns A boolean indicator of whether or not the program is installed
 */
const isUnixInstalled = (program) => {
  return Boolean(exec(`hash ${program} 2>/dev/null`))
}

/**
 * Checks if an application is installed and has a `*.desktop` link
 *
 * @param {*} program - Program to look for
 * @returns A boolean indicator of whether or not the program is installed
 */
const isDotDesktopInstalled = (program) => {
  const directories = [
    process.env.XDG_DATA_HOME && `${process.env.XDG_DATA_HOME}/applications`,
    process.env.HOME && `${process.env.HOME}/.local/share/applications`,
    '/usr/share/applications',
    '/usr/local/share/applications'
  ]
    .filter(Boolean)
    .filter((path) => Boolean(readdirSync(path)))

  const desktopFiles = directories
    .flatMap((directory) => readdirSync(directory))
    .filter((file) => file.endsWith('.desktop'))
    .map((item) => item.replace(/\.desktop$/u, ''))

  return desktopFiles.includes(program.replace(/\.desktop$/u, ''))
}

/**
 * Determines if a program is installed on a Darwin-based OS
 *
 * @param {*} program - Program to check for
 * @returns A boolean indicating if the program is installed
 */
const isMacInstalled = (program) => {
  return Boolean(exec(`osascript -e 'id of application "${program}"' 2>&1>/dev/null`))
}

/**
 * Checks if program is installed in a Windows environment
 *
 * @param {*} program - Program to check for
 * @returns A boolean indicating whether or not the program is installed
 */
const isWindowsInstalled = (program) => {
  /*
   * Try a couple variants, depending on execution environment the .exe
   * may or may not be required on both `where` and the program name.
   */
  const attempts = [`where ${program}`, `where ${program}.exe`, `where.exe ${program}`, `where.exe ${program}.exe`]

  return attempts.map((attempt) => Boolean(exec(attempt))).includes(true)
}

/**
 * Combines several methods for determining whether or not a program
 * is installed.
 *
 * @param {*} program - Program to check for
 * @returns A boolean indicating whether or not a program is installed
 */
const isInstalled = (program) =>
  [isUnixInstalled, isMacInstalled, isWindowsInstalled, isDotDesktopInstalled].some((check) => check(program))

/**
 * Prompts the user for the operating system they wish to launch and test the
 * Ansible play against.
 *
 * @returns The lowercased operating system choice
 */
async function promptForDesktop() {
  const choices = ['Archlinux', 'CentOS', 'Debian', 'Fedora', 'macOS', 'Ubuntu', 'Windows']
  const choicesDecorated = choices.map((choice) => decorateSystem(choice))
  const response = await inquirer.prompt([
    {
      choices: choicesDecorated,
      message: 'Which desktop operating system would you like to provision?',
      name: 'operatingSystem',
      type: 'list'
    }
  ])

  return response.operatingSystem.replace('● ', '').toLowerCase()
}

/**
 * Prompts the user for the virtualization platform they wish to use. Before presenting
 * the options some basic verification is done to ensure that only the options available
 * on the system are presented.
 *
 * @returns The chosen virtualization provider
 */
// eslint-disable-next-line max-statements, require-jsdoc
async function promptForPlatform() {
  const choices = []
  if (
    process.platform === 'win32' &&
    execPowerShell(
      '$hyperv = Get-WindowsOptionalFeature -FeatureName Microsoft-Hyper-V-All -Online; $hyperv.State -eq "Enabled"'
    )
  ) {
    choices.push('Hyper-V')
  }
  if ((process.platform === 'darwin' || process.platform === 'linux') && isInstalled('kvm')) {
    choices.push('KVM')
  }
  if (process.platform === 'darwin' && isInstalled('Parallels Desktop.app')) {
    choices.push('Parallels')
  }
  if (isInstalled('virtualbox')) {
    choices.push('VirtualBox')
  }
  if (process.platform === 'darwin' && isInstalled('VMware Fusion.app')) {
    choices.push('VMWare Fusion')
  }
  if (process.platform !== 'darwin' && isInstalled('vmware')) {
    choices.push('VMWare Workstation')
  }
  const response = await inquirer.prompt([
    {
      choices,
      message: 'Which virtualization platform would you like to use?',
      name: 'virtualizationPlatform',
      type: 'list'
    }
  ])

  return platformMap[response.virtualizationPlatform]
}

/**
 * Main script logic
 */
async function run() {
  signale.info(
    'Use the following prompts to select the type of operating system and' +
      ' the virtualization platform you wish to use with Vagrant.'
  )
  const operatingSystem = await promptForDesktop()
  const virtualizationPlatform = await promptForPlatform()
  // eslint-disable-next-line no-console
  console.log(`--provider=${virtualizationPlatform} ${operatingSystem}`)
}

run()