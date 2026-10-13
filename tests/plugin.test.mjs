import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'

const iconNames = ['ChevronLeft', 'ChevronRight', 'Code', 'Data', 'Download', 'FolderOpen', 'Fullscreen', 'PanelLeft', 'Play', 'Refresh', 'Trash']
const iconStub = () => null
function iconExports(modern) {
  return Object.fromEntries(iconNames.map(name => [
    `Icon${name}Outline${modern ? 'Regular' : name.startsWith('Chevron') ? '14' : '16'}`,
    iconStub,
  ]))
}
const primitives = iconExports(false)

const registrations = []
globalThis.document = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, textContent: '' }),
  head: { append: () => {}, appendChild: () => {} },
}
globalThis.window = {
  __ModuleLoader__: {
    load(registration) { registrations.push(registration) },
  },
}

await import(`${new URL('../lib/client.js', import.meta.url).href}?test=${Date.now()}`)

test('client bundle registers the expected DSH module', () => {
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].id, 'dsh-plugin-geogebra-pic')
  assert.equal(typeof registrations[0].factory, 'function')
})

test('client plugin contributes a Sidebar type and session action', () => {
  const modules = {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    '@deepseek-ai/dsh-client-ui-primitives': primitives,
  }
  const plugin = registrations[0].factory(specifier => modules[specifier])
  assert.deepEqual(plugin.inject, ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs'])

  const slotEntries = []
  const tabTypes = []
  const opened = []
  const ctx = {
    locale: {
      bind: () => key => key,
      register: () => () => {},
    },
    sidebarRight: { openTab: kind => { opened.push(kind) } },
    sidebarRightTabs: { register: definition => { tabTypes.push(definition); return () => {} } },
    slots: {
      inject: (_name, install) => install(),
      register: (options, component) => { slotEntries.push({ options, component }); return () => {} },
    },
    effect: install => install(),
  }

  plugin.apply(ctx)
  assert.equal(tabTypes.length, 1)
  assert.equal(tabTypes[0].id, 'dsh-plugin-geogebra-pic')
  assert.equal(tabTypes[0].kind, 'geogebra')
  assert.equal(tabTypes[0].title(), 'type.label')
  assert.equal(tabTypes[0].guide[0].title(), 'guide.title')

  assert.deepEqual(slotEntries.map(entry => entry.options.name), [
    'sidebar.right.pane.tab',
    'conversation.session.header.actions',
  ])
  const action = slotEntries.find(entry => entry.options.id === 'geogebra-pic-open')
  assert.ok(action)
  action.options.inject().openGeoGebra()
  assert.deepEqual(opened, ['geogebra'])
})

for (const modern of [false, true]) {
  test(`entry and workspace render with ${modern ? 'weight' : 'size'}-named Harness icons`, () => {
    const modules = {
      react: {
        ...React,
        useRef: value => ({ current: value }),
        useState: value => [value, () => {}],
        useCallback: callback => callback,
        useEffect: () => {},
      },
      'react/jsx-runtime': jsxRuntime,
      '@deepseek-ai/dsh-client-ui-primitives': iconExports(modern),
    }
    const plugin = registrations[0].factory(specifier => modules[specifier])
    const entries = []
    const definitions = []
    plugin.apply({
      locale: { bind: () => key => key, register: () => () => {} },
      sidebarRight: { openTab: () => {} },
      sidebarRightTabs: { register: definition => { definitions.push(definition); return () => {} } },
      slots: {
        inject: (_name, install) => install(),
        register: (options, component) => { entries.push({ options, component }); return () => {} },
      },
      effect: install => install(),
    })
    assert.equal(definitions[0].guide[0].icon, iconStub)
    const props = { t: key => key, useTabInfo: () => ({ tab: { id: 'test-tab' } }), openGeoGebra: () => {} }
    function check(node) {
      if (Array.isArray(node)) { node.forEach(check); return }
      if (!React.isValidElement(node)) return
      assert.ok(node.type, 'every element must have a defined component; missing icons cause React #130')
      check(node.props.children)
    }
    for (const entry of entries) check(entry.component(props))
  })
}
