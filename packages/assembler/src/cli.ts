#!/usr/bin/env node
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { assembleAndZip, assemblePackage } from './assembler.js'
import { resolveClosure } from './closure.js'
import { loadManifest } from './manifest.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const program = new Command()

program
  .name('biz-export')
  .description('Assemble a selective Vue3 business component package from manifest artifacts')
  .option('-c, --components <names>', 'Comma-separated component names', 'Button,OrderTable')
  .option('-o, --out <dir>', 'Output directory', './out/custom-biz-kit')
  .option('-m, --manifest <path>', 'Path to components.manifest.json')
  .option('-l, --library-root <path>', 'Path to built component library root')
  .option('-n, --name <packageName>', 'Output package name', '@customer/biz-kit')
  .option('--customer <name>', 'Customer name for watermark/license', 'Demo Customer')
  .option('--customer-id <id>', 'Customer identifier')
  .option('--order-id <id>', 'Order identifier')
  .option('--version <version>', 'Output package version')
  .option('--zip', 'Also create a ZIP archive', false)
  .option('--preview-closure', 'Only print dependency closure and exit', false)
  .action(async (opts) => {
    const repoRoot = resolve(__dirname, '../../..')
    const manifestPath =
      opts.manifest ?? join(repoRoot, 'packages/mock-component-library/components.manifest.json')
    const libraryRoot = opts.libraryRoot ?? join(repoRoot, 'packages/mock-component-library')
    const selectedComponents = String(opts.components)
      .split(',')
      .map((item: string) => item.trim())
      .filter(Boolean)
    const outputDir = resolve(opts.out)

    const manifest = loadManifest(manifestPath)

    if (opts.previewClosure) {
      const closure = resolveClosure(manifest, selectedComponents)
      console.log(JSON.stringify(closure, null, 2))
      return
    }

    if (opts.zip) {
      const zipPath = `${outputDir}.zip`
      const result = await assembleAndZip({
        manifestPath,
        libraryRoot,
        selectedComponents,
        outputDir,
        packageName: opts.name,
        customerName: opts.customer,
        customerId: opts.customerId,
        orderId: opts.orderId,
        version: opts.version,
        zipPath,
      })
      console.log(`Package assembled: ${result.outputDir}`)
      console.log(`ZIP created: ${result.zipPath}`)
      console.log(`Fingerprint: ${result.fingerprint}`)
      if (result.closure.warnings.length) {
        console.warn('Warnings:')
        for (const warning of result.closure.warnings) {
          console.warn(`  - ${warning}`)
        }
      }
      return
    }

    const result = assemblePackage({
      manifestPath,
      libraryRoot,
      selectedComponents,
      outputDir,
      packageName: opts.name,
      customerName: opts.customer,
      customerId: opts.customerId,
      orderId: opts.orderId,
      version: opts.version,
    })

    console.log(`Package assembled: ${result.outputDir}`)
    console.log(`Fingerprint: ${result.fingerprint}`)
    if (result.closure.warnings.length) {
      console.warn('Warnings:')
      for (const warning of result.closure.warnings) {
        console.warn(`  - ${warning}`)
      }
    }
  })

program.parse()
