let indentation = 2;
let luckBased = false;
let historyBuffer = 100;
let history = ['{}'];
let historyIndex = 0;

let structure;
let components;
let collections;
let table = {};
let listeners = [];

const generators = {
  'recipe': ['1.14','1.15','1.16'],
}

const params = new URLSearchParams(window.location.search);
if (params.has('s')) {
  let short = params.get('s').slice(0, -7);
  window.location = 'https://zws.im/' + short;
}

function addListener(listener) {
  listeners.push(listener);
  listener();
}

loadGenerator($('[data-generator]').attr('data-generator'));
function loadGenerator(generator) {
  if (!generator) return;
  const versions = generators[generator] || [];
  versions.forEach(v => {
    $('#versionList').append(`<a class="dropdown-item" onclick="changeVersion('${generator}', '${v}')">${v}</a>`)
  });
  const promises = [initShared(), initLng(), loadVersion(generator, versions[versions.length - 1])];
  Promise.all(promises).then(() => {
    if (params.has('q')) {
      $('#source').val(atob(params.get('q')));
      updateSource();
    } else {
      table = structure.default;
    }
    invalidated()
  });
}

function loadVersion(generator, version) {
  return $.getJSON('../schemas/' + version + '.json', json => {
    structure = json.root || json.roots.find(e => e.id === generator);
    components = json.components;
    collections = json.collections;
  }).fail((jqXHR, textStatus, errorThrown) => {
    let message = 'Failed loading ' + version + ' schema';
    structure = {};
    console.error(message + '\n' + errorThrown);
  }).always(() => {
    $('#versionLabel').text(version);
  });
}

function changeVersion(generator, version) {
  loadVersion(generator, version).then(() => {
    invalidated();
  });
}

async function initShared() {
  const components = await fetch('../components.html').then(r => r.text());
  const shared = await fetch('../shared.html').then(r => r.text());
  $('body').append(components);
  $('div.container').append(shared);
}

$("#source").val('');
$('#luckBased').prop('checked', false);
$('#tableType').val("minecraft:generic");
$('#indentationSelect').val("2");


$(document).keydown(function(e){
  if (e.which === 89 && e.ctrlKey ){
     redo();
  } else if (e.which === 90 && e.ctrlKey ){
     undo();
  }
});

function undo() {
  if (historyIndex > 0) {
    historyIndex -= 1;
    table = JSON.parse(history[historyIndex]);
    listeners.forEach(l => l());
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex += 1;
    table = JSON.parse(history[historyIndex]);
    listeners.forEach(l => l());
  }
}

function invalidated() {
  if (historyIndex === history.length - 1) {
    history.push(JSON.stringify(table));
    if (history.length > historyBuffer) {
      history = history.slice(-historyBuffer);
    }
    historyIndex = history.length - 1;
  } else {
    historyIndex += 1;
    history = history.slice(0, historyIndex);
    history.push(JSON.stringify(table));
  }
  listeners.forEach(l => l());
}

function updateTableType() {
  table.type = $('#tableType').val();
  invalidated();
}

function updateLuckBased() {
  luckBased = $('#luckBased').prop('checked');
  invalidated();
}

function showSource() {
  $('.source-container').removeClass('d-none');
  $('.structure-container').addClass('col-lg-7');
  $('#showSourceButton').addClass('d-none');
}

async function linkSource() {
  let site = window.location.origin + window.location.pathname;
  let url = site + '?q=' + btoa(JSON.stringify(table));
  if (url.length <= 500) {
    let shortener = 'https://us-central1-zero-width-shortener.cloudfunctions.net/shortenURL?url=';
    let response = await fetch(shortener + url);
    let json = await response.json();
    let id = Math.random().toString(36).substring(2, 9);
    url = site + '?s=' + json.short + id;
  }
  $('#copyContainer').removeClass('d-none');
  $('#copyTextarea').val(url);
  $('#copyTextarea').get()[0].select();
}

function copyLink() {
  $('#copyTextarea').get()[0].select();
  document.execCommand('copy');
  setTimeout(() => {
    $('#copyContainer').addClass('d-none');
  }, 100);
}

function updateSource() {
  $('#source').removeClass('invalid');
  try {
    table = JSON.parse($('#source').val());
  } catch(e) {
    if ($('#source').val().length > 0) {
      $('#source').addClass('invalid');
      return;
    }
    table = {};
  }
  invalidated();
}

function updateIndentation(value) {
  indentation = value;
  invalidated();
}

function copySource(el) {
  $('#source').get()[0].select();
  document.execCommand('copy');
}

function getPath(el) {
  let $node = $(el).closest('[data-index]');
  let index = $node.attr('data-index');
  if (index === 'root') return [];
  let parent = getPath($node.parent());
  parent.push(index);
  return parent;
}

function getNode(path) {
  let node = table;
  for (let index of path) {
    if (!isNaN(index)) {
      index = +index;
    } else if (node[index] === undefined) {
      node[index] = {};
    }
    node = node[index];
  }
  return node;
}

function getType(el) {
  let $field = $(el).closest('[data-index]');
  if ($field) {
    return $field.attr('data-type');
  }
}

function getParent(el) {
  let path = getPath(el);
  path.pop();
  return getNode(path);
}

function getSuperParent(el) {
  let path = getPath(el);
  path.pop();
  path.pop();
  return getNode(path);
}

function addComponent(el, array) {
  let node = getNode(getPath(el));
  if (!node[array]) {
    node[array] = [];
  }
  node[array].push({});
  invalidated();
}

function removeComponent(el) {
  let path = getPath(el);
  let index = path.pop();
  let array = path.pop();
  let node = getNode(path);
  node[array].splice(index, 1);
  if (node[array].length === 0) {
    delete node[array];
  }
  invalidated();
}

function addToSet(el, array) {
  let parent = getParent(el);
  if (!parent[array]) {
    parent[array] = [];
  }
  parent[array].push($(el).attr('value'));
  invalidated();
}

function removeFromSet(el, array) {
  let parent = getParent(el);
  let index = parent[array].indexOf($(el).attr('value'));
  if (index > -1) {
    parent[array].splice(index, 1);
    invalidated();
  }
}

function addToMap(el) {
  let node = getParent(el);
  let $field = $(el).closest('[data-index]');
  let map = $field.attr('data-index');
  node[map] = correctMap(node[map])
  let idNum = Object.values(node[map]).length+1
  let key = idNum.toString();

  let type = $field.attr('data-item-type');
  if (!node[map]) {
    node[map] = {};
  }
  if ($field.attr('data-resource')) {
    key = fixResource(key)
  }
  if (type === 'int') {
    node[map][key] = 0;
  } else if (type === 'boolean') {
    node[map][key] = false;
  } else if (type === 'object') {
    node[map][key] = {};
  } else {
    node[map][key] = "";
  }
  invalidated();
}

function removeFromMap(el) {
  let path = getPath(el);
  let key = path.pop();
  let node = getNode(path);
  delete node[key];
  if (Object.keys(node).length === 0) {
    let field = path.pop();
    let parent = getNode(path);
    delete parent[field];
  }
  let newArr = correctMap(node)
  if (node) arr = Object.keys(node)
  for (arr in node) {
    delete node[arr];
  }
  key = 0
  for (arr in newArr) {
    key++
    node[key.toString()] = newArr[arr]
  }
  invalidated();
}

function toggleCollapseObject(el) {
  let path = getPath(el);
  let index = path.pop();
  let node = getNode(path);
  if (typeof node[index] !== 'object') {
    node[index] = {};
  } else {
    delete node[index];
  }
  invalidated();
}

function updateField(el) {
  let path = getPath(el);
  let $field = $(el).closest('[data-index]');
  let field = path.pop();
  let node = getNode(path);
  let type = getType(el);
  let value = undefined;

  if (type === 'count' || type === 'systemField' || type === 'scoreboard' || type === 'id' || type === 'string' || type === 'int' || type === 'enum' || type === 'json' || type === 'nbt' || type === 'string-list' || type === 'chance-list') {
    value = $(el).val();
  }

  if (type === 'systemField') {
    let lengthOfValue = value.length
    for (let i = 0; i< lengthOfValue; i++) {
      value = value.replace(/[а-яА-Я]/, '').replace(/[а-яА-Я]/, '')
    }
  } else if (type === 'int') {
    value = parseInt(value);
    if (isNaN(value)) {
      value = '';
    }
  } else if (type === 'enum') {
    if (value === 'unset') {
      value = '';
    }
    let id = node.id
    if (value.substring(10)=='item') {
      id = id.replace('#', '')
      if (id.indexOf("minecraft:")==0) id=id.substring(10)
      if (idTest(id)) {
        id = "minecraft:"+id;
      }
    } else {
      id = '#'+id.replace('#', '')
    }
    node.id = id
  } else if (type === 'nbt') {

    if (!value.startsWith('{') && value.length > 0) {
      value = '{' + value;
    }
    if (!value.endsWith('}') && value.length > 0) {
      value = value + '}';
    }
  } else if (type === 'json') {
    value = parseJSONValue(value)
  } else if (type === 'boolean') {
    value = getBooleanValue(node[field], ($(el).val() === 'true'));
  } else if (type === 'scoreboard') {
    value = value.substring(0,16);
  } else if (type === 'count') {
    value = parseInt(value);
    if (isNaN(value)) {
      value = '';
    }
    value = Number(value>0? value : 1).toString()
  } else if (type === 'id') {
    if (value.indexOf(' ')!=-1) {
      value = value.replace(' ', '');
    }
    if (node.type.substring(10)=='item') {
      value = value.replace('#', '')
      if (value.indexOf("minecraft:")==0) value=value.substring(10)
      if (idTest(value)) {
          value = "minecraft:"+value;
      }
    } else {
      value = '#'+value.replace('#', '')
    }

  }

  if ($field.attr('data-resource')) {
    value = fixResource(value)
  }

  if (value === '') {
    delete node[field];
  } else {
    if (type === 'enum') {
      node._changed = true;
    }
    node[field] = value;
  }
  invalidated();
}

function fixResource(value) {
  const test = /^([a-z0-9_.-]*:)?[a-z0-9/_.-]+$/;
  if (value.match(test) === null) {
    value = value.toLowerCase();
    if (value.match(test) === null) {
      value = value.replace(/[^a-z0-9_.-]/g, '')
    }
  }
  return value;
}

function updateRangeType(el) {
  let path = getPath(el);
  let field = path.pop();
  let node = getNode(path);
  let type = $(el).attr('value');
  if (type === 'range') {
    node[field] = {};
  } else if (type === 'binomial') {
    node[field] = {type: "minecraft:binomial"};
  } else {
    node[field] = 0;
  }
  updateField(el);
}

function getRangeValue($field, data) {
  if (typeof data === 'object') {
    if (data.type && data.type.match(/(minecraft:)?binomial/)) {
      let n = $field.find('.binomial.n').val();
      let p = $field.find('.binomial.p').val();
      if (n) data.n = parseInt(n);
      else delete data.n;
      if (p) data.p = parseFloat(p);
      else delete data.p;
    } else {
      let min = $field.find('.range.min').val();
      let max = $field.find('.range.max').val();
      if (min) data.min = parseFloat(min);
      else delete data.min;
      if (max) data.max = parseFloat(max);
      else delete data.max;
    }
  } else {
    data = parseFloat($field.find('.exact').val());
    if (isNaN(data)) {
      data = '';
    }
  }
  return data;
}

function getBooleanValue(oldvalue, newvalue) {
  if (oldvalue === newvalue) {
    return '';
  } else if (newvalue) {
    return true;
  } else {
    return false;
  }
}

function parseJSONValue(value) {
  if (value.startsWith('"') || value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch(e) {
      return value;
    }
  }
  return value;
}

function collapseComponent(el) {
  let path = getPath(el);
  let field = path.pop();
  let node = getNode(path);
  if (node[field]._collapse) {
    delete node[field]._collapse
  } else {
    node[field]._collapse = true;
  }
  invalidated();
}

function idTest(id) {
  let idList = collections.idList
  let arr = idList.find(el => el == id)
  return arr? true : false
}

function correctMap(node) {
  let arr
  let newArr = {}
  let sys = 0
  if (node) arr = Object.keys(node)
  for (arr in node) {
    sys++
    newArr[sys.toString()] = node[arr]
  }
  return newArr
}