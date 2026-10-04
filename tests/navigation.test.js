const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function loadFeature(file) {
  const elements = [];
  function createElement(tag) {
    const element = {
      tag, children: [], value: '', handlers: {},
      appendChild(child) { this.children.push(child); return child; },
      setAttribute() {}, focus() {},
      addEventListener(event, handler) { this.handlers[event] = handler; },
      set innerHTML(value) { this.children = []; },
      fire(event) { this.handlers[event]({ preventDefault() {} }); }
    };
    elements.push(element);
    return element;
  }
  const status = createElement('div');
  const results = createElement('div');
  const window = {};
  const document = { createElement, getElementById: (id) => id === 'status' ? status : results };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { window, document });
  const history = [];
  const state = {
    games: [
      { title: 'Doom', console: 'PC', month: 10, year: 1993 },
      { title: 'Quake', console: 'PlayStation', month: 11, year: 1994 }
    ],
    cinema: [], music: [], wwe: [], rental: [], cartoons: [], consoleLaunches: []
  };
  const context = {
    getState: () => state, isLoaded: () => true,
    setLandingChromeVisible() {}, scrollResultViewToTop() {},
    monthNameFromNumber: (month) => String(month),
    writeViewHistory: (value) => history.push({ ...value }),
    getConsoleLaunchesForMonth: () => [], getCultureCategoryDefinitions: () => [],
    normalizeConsoleText: (value) => value.toLowerCase()
  };
  return { window, context, history, elements };
}

test('restored date browse records later user selections without recording the restoration', () => {
  const { window, context, history, elements } = loadFeature('browse.js');
  const feature = window.GameRewindBrowse.createBrowseFeature(context);
  feature.renderBrowseByDate({ skipHistory: true, month: 10, year: 1993, showList: true });
  assert.equal(history.length, 0);
  const selects = elements.filter((element) => element.tag === 'select');
  selects[0].value = '11'; selects[1].value = '1994';
  elements.find((element) => element.tag === 'button').fire('click');
  assert.deepEqual(history, [{ type: 'browse-date', month: 11, year: 1994 }]);
});

test('restored console browse records a newly selected console', () => {
  const { window, context, history, elements } = loadFeature('browse.js');
  window.GameRewindBrowse.createBrowseFeature(context).renderBrowseByConsole({ skipHistory: true, console: 'PC', showList: true });
  assert.equal(history.length, 0);
  elements.find((element) => element.tag === 'select').value = 'PlayStation';
  elements.find((element) => element.tag === 'button').fire('click');
  assert.deepEqual(history, [{ type: 'browse-console', console: 'PlayStation' }]);
});

test('restored birthday list records later builds without recording the restored timeline', () => {
  const { window, context, history, elements } = loadFeature('birthday.js');
  window.GameRewindBirthday.createBirthdayFeature(context).renderBirthdayList({ skipHistory: true, date: '1980-01-04', showTimeline: true });
  assert.equal(history.length, 0);
  elements.find((element) => element.tag === 'input').value = '1981-02-05';
  elements.find((element) => element.tag === 'form').fire('submit');
  assert.deepEqual(history, [{ type: 'birthday', date: '1981-02-05' }]);
});
