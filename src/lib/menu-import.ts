// Bulk menu import for the Koop admin: reads a pasted/uploaded CSV (or a sheet pasted from Excel or
// Google Sheets) of menu items, plus an optional second CSV defining modifier groups, and works out
// exactly what would be created or changed so it can be shown as a preview before anything is written.
// Pure functions only - no Firebase here - so the rules are easy to test.

import { categories } from '@/lib/types';
import { AUTHORIZED_SERVICE_MODES } from '@/lib/utils';

export const MAX_IMPORT_ROWS = 1000;

// ---------------------------------------------------------------------------------------------
// CSV reading
// ---------------------------------------------------------------------------------------------

// Splits CSV text into rows of cells. Handles quoted cells (with commas, line breaks and "" quotes),
// a leading byte-order mark, Windows line endings, and tab-separated text (what you get when you
// copy cells out of a spreadsheet).
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delimiter = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }

  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
export const nameKey = (s: string) => norm(s);

export const slugify = (name: string) => name.toLowerCase()
  .replace(/[^a-z0-9]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

// Finds which column holds each field, accepting the usual alternative headings.
function mapHeaders<K extends string>(header: string[], aliases: Record<K, string[]>): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  const cleaned = header.map(h => norm(h).replace(/[_*]/g, ' ').replace(/\s+/g, ' '));
  (Object.keys(aliases) as K[]).forEach(key => {
    const idx = cleaned.findIndex(h => aliases[key].includes(h));
    if (idx >= 0) out[key] = idx;
  });
  return out;
}

export function parsePrice(raw: string, allowNegative = false): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, '').replace(/^\+/, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  if (n < 0 && !allowNegative) return null;
  return Math.round(n * 100) / 100;
}

const yes = (s: string) => ['yes', 'y', 'true', '1', 'required', 'x'].includes(norm(s));
const splitList = (s: string) => s.split(/[|;]/).map(p => p.trim()).filter(Boolean);

// ---------------------------------------------------------------------------------------------
// Service modes
// ---------------------------------------------------------------------------------------------

const MODE_ALIASES: Record<string, string> = {
  'beverage cart': 'Beverage Cart', 'bev cart': 'Beverage Cart', 'bevcart': 'Beverage Cart', 'cart': 'Beverage Cart', 'beverage': 'Beverage Cart',
  'clubhouse': 'Clubhouse', 'club house': 'Clubhouse', 'grill': 'Clubhouse', 'halfway house': 'Clubhouse',
  'lane delivery': 'Lane Delivery', 'lane service': 'Lane Delivery', 'lanes': 'Lane Delivery', 'lane': 'Lane Delivery', 'laneside': 'Lane Delivery',
};

export function resolveMode(raw: string): string | null {
  const key = norm(raw);
  const exact = AUTHORIZED_SERVICE_MODES.find(m => norm(m) === key);
  return exact || MODE_ALIASES[key] || null;
}

// ---------------------------------------------------------------------------------------------
// Items file
// ---------------------------------------------------------------------------------------------

export interface ItemRow {
  line: number; // line number in the file (header is line 1)
  name: string;
  description: string;
  priceRaw: string;
  categoryRaw: string;
  modesRaw: string;
  modifiersRaw: string;
}

const ITEM_ALIASES = {
  name: ['name', 'item', 'item name', 'product', 'product name'],
  description: ['description', 'desc', 'details'],
  price: ['price', 'cost', 'amount'],
  category: ['category', 'section', 'type'],
  modes: ['modes', 'mode', 'service mode', 'service modes', 'menus', 'menu', 'available on'],
  modifiers: ['modifier groups', 'modifier group', 'modifiers', 'modifier', 'mods', 'options'],
};

export interface FileResult<T> { rows: T[]; fileProblems: string[] }

export function parseItemsCsv(text: string): FileResult<ItemRow> {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], fileProblems: [] };
  const cols = mapHeaders(table[0], ITEM_ALIASES);
  const fileProblems: string[] = [];
  if (cols.name === undefined) fileProblems.push('The items file needs a "Name" column.');
  if (cols.price === undefined) fileProblems.push('The items file needs a "Price" column.');
  if (cols.category === undefined) fileProblems.push('The items file needs a "Category" column.');
  if (fileProblems.length) return { rows: [], fileProblems };

  const cell = (r: string[], i?: number) => (i === undefined ? '' : (r[i] ?? '').trim());
  const rows = table.slice(1).map((r, idx): ItemRow => ({
    line: idx + 2,
    name: cell(r, cols.name),
    description: cell(r, cols.description),
    priceRaw: cell(r, cols.price),
    categoryRaw: cell(r, cols.category),
    modesRaw: cell(r, cols.modes),
    modifiersRaw: cell(r, cols.modifiers),
  }));
  if (rows.length > MAX_IMPORT_ROWS) fileProblems.push(`That is ${rows.length} rows. Import up to ${MAX_IMPORT_ROWS} at a time.`);
  return { rows, fileProblems };
}

// ---------------------------------------------------------------------------------------------
// Modifier groups file
// ---------------------------------------------------------------------------------------------

export interface GroupDef {
  line: number;
  name: string;
  multi: boolean;
  required: boolean;
  max?: number;
  options: { name: string; price: number }[];
  problems: string[];
}

const GROUP_ALIASES = {
  group: ['group', 'group name', 'modifier group', 'modifier', 'name'],
  selection: ['selection', 'selection type', 'type', 'choose', 'pick'],
  required: ['required', 'require', 'mandatory'],
  max: ['max', 'max choices', 'maximum', 'max selections'],
  option: ['option', 'option name', 'choice', 'value'],
  price: ['price', 'price change', 'upcharge', 'adjustment', 'extra', 'add price', 'cost'],
};

// One row per option; the group's name, selection and required cells only need to be filled on its
// first row (blank group cells continue the previous group, as they naturally do in a spreadsheet).
export function parseGroupsCsv(text: string): FileResult<GroupDef> {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], fileProblems: [] };
  const cols = mapHeaders(table[0], GROUP_ALIASES);
  const fileProblems: string[] = [];
  if (cols.group === undefined) fileProblems.push('The modifier file needs a "Group" column.');
  if (cols.option === undefined) fileProblems.push('The modifier file needs an "Option" column.');
  if (fileProblems.length) return { rows: [], fileProblems };

  const cell = (r: string[], i?: number) => (i === undefined ? '' : (r[i] ?? '').trim());
  const groups: GroupDef[] = [];
  const byKey = new Map<string, GroupDef>();
  let current: GroupDef | null = null;

  table.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const groupName = cell(r, cols.group);
    if (groupName) {
      const key = nameKey(groupName);
      let g = byKey.get(key) || null;
      if (!g) {
        g = { line, name: groupName, multi: false, required: false, options: [], problems: [] };
        byKey.set(key, g);
        groups.push(g);
      }
      current = g;
    }
    const g = current;
    if (!g) return;

    const sel = cell(r, cols.selection);
    if (sel) {
      const s = norm(sel);
      if (['single', 'one', 'pick one', 'choose one', 'radio'].includes(s)) g.multi = false;
      else if (['multiple', 'multi', 'many', 'pick many', 'choose many', 'any', 'checkbox'].includes(s)) g.multi = true;
      else g.problems.push(`Line ${line}: selection "${sel}" should be Single or Multiple.`);
    }
    const req = cell(r, cols.required);
    if (req) g.required = yes(req);
    const maxRaw = cell(r, cols.max);
    if (maxRaw) {
      const m = Number(maxRaw);
      if (Number.isInteger(m) && m >= 1) g.max = m;
      else g.problems.push(`Line ${line}: max "${maxRaw}" should be a whole number of 1 or more.`);
    }

    const optName = cell(r, cols.option);
    if (optName) {
      const priceRaw = cell(r, cols.price);
      const price = priceRaw === '' ? 0 : parsePrice(priceRaw, true);
      if (price === null) {
        g.problems.push(`Line ${line}: price "${priceRaw}" for "${optName}" is not a number.`);
      } else if (g.options.some(o => nameKey(o.name) === nameKey(optName))) {
        g.problems.push(`Line ${line}: option "${optName}" is listed twice.`);
      } else {
        g.options.push({ name: optName, price });
      }
    }
  });

  groups.forEach(g => { if (g.options.length === 0) g.problems.push(`"${g.name}" has no options.`); });
  return { rows: groups, fileProblems };
}

// ---------------------------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------------------------

export interface ExistingItem { id: string; name: string }
export interface ExistingGroup { id: string; name: string }
export interface LibraryGroup {
  name: string;
  required: boolean;
  selectionType: 'single' | 'multi';
  options: { label: string; priceModifier: number }[];
}

export interface PlannedGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: { id: string; name: string; priceAdjustment: number; isAvailable: boolean }[];
  source: 'file' | 'library';
  action: 'create' | 'update';
}

export type ItemAction = 'create' | 'update' | 'skip' | 'error';

export interface PlannedItem {
  line: number;
  name: string;
  description: string;
  price: number;
  category: string | null; // null until an unknown category is mapped
  categoryRaw: string;
  modes: string[];
  groupIds: string[] | null; // null = row named no groups (an update then leaves them as they are)
  groupNames: string[];
  existingId?: string;
  action: ItemAction;
  errors: string[];
  warnings: string[];
}

export interface ImportOptions {
  venueId: string;
  existingPolicy: 'skip' | 'update';
  defaultModes: string[]; // put rows that name no mode on these
  categoryMap: Record<string, string>; // unknown category (lower case) -> a real category
}

export interface ImportPlan {
  fileProblems: string[];
  groups: PlannedGroup[];
  groupProblems: string[];
  items: PlannedItem[];
  unknownCategories: string[]; // as written in the file, one per distinct value
  counts: { create: number; update: number; skip: number; error: number };
}

const CATEGORY_LOOKUP = new Map(categories.filter(c => c !== 'Featured').map(c => [norm(c), c as string]));

export function resolveCategory(raw: string, categoryMap: Record<string, string> = {}): string | null {
  const key = norm(raw);
  return CATEGORY_LOOKUP.get(key) || (categoryMap[key] && CATEGORY_LOOKUP.get(norm(categoryMap[key]))) || null;
}

export function buildPlan(
  itemRows: ItemRow[],
  groupDefs: GroupDef[],
  existingItems: ExistingItem[],
  existingGroups: ExistingGroup[],
  library: LibraryGroup[],
  opts: ImportOptions,
): ImportPlan {
  const groupId = (name: string) => `${opts.venueId}-${slugify(name)}`;

  // Modifier groups defined in the file. A group with problems is not written, and items that use it say so.
  const groups = new Map<string, PlannedGroup>();
  const badGroups = new Map<string, string[]>();
  const groupProblems: string[] = [];
  const venueGroupKeys = new Set(existingGroups.map(g => nameKey(g.name)));
  groupDefs.forEach(def => {
    if (def.problems.length) {
      badGroups.set(nameKey(def.name), def.problems);
      groupProblems.push(...def.problems);
      return;
    }
    const maxSelection = def.multi ? (def.max ?? 99) : 1;
    const minSelection = def.required ? 1 : 0;
    groups.set(nameKey(def.name), {
      id: groupId(def.name),
      name: def.name,
      minSelection,
      maxSelection: Math.max(maxSelection, minSelection),
      options: def.options.map(o => ({ id: slugify(o.name), name: o.name, priceAdjustment: o.price, isAvailable: true })),
      source: 'file',
      action: venueGroupKeys.has(nameKey(def.name)) ? 'update' : 'create',
    });
  });

  const existingGroupByKey = new Map(existingGroups.map(g => [nameKey(g.name), g]));
  const libraryByKey = new Map(library.map(g => [nameKey(g.name), g]));
  const usedLibrary = new Map<string, PlannedGroup>();

  const resolveGroup = (name: string): { id: string } | { error: string } => {
    const key = nameKey(name);
    if (badGroups.has(key)) return { error: `Modifier group "${name}" has problems in the modifier file.` };
    const fromFile = groups.get(key);
    if (fromFile) return { id: fromFile.id };
    const onVenue = existingGroupByKey.get(key);
    if (onVenue) return { id: onVenue.id };
    const fromLibrary = libraryByKey.get(key);
    if (fromLibrary) {
      const planned = usedLibrary.get(key) || {
        id: groupId(fromLibrary.name),
        name: fromLibrary.name,
        minSelection: fromLibrary.required ? 1 : 0,
        maxSelection: fromLibrary.selectionType === 'single' ? 1 : 99,
        options: (fromLibrary.options || []).map(o => ({ id: slugify(o.label), name: o.label, priceAdjustment: o.priceModifier, isAvailable: true })),
        source: 'library' as const,
        action: 'create' as const,
      };
      usedLibrary.set(key, planned);
      return { id: planned.id };
    }
    return { error: `Modifier group "${name}" was not found. Add it to the modifier file, or check the spelling.` };
  };

  const existingByKey = new Map(existingItems.map(i => [nameKey(i.name), i]));
  const seenInFile = new Set<string>();
  const unknown = new Map<string, string>();

  const items = itemRows.map((row): PlannedItem => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const planned: PlannedItem = {
      line: row.line, name: row.name, description: row.description, price: 0,
      category: null, categoryRaw: row.categoryRaw, modes: [], groupIds: null, groupNames: [],
      action: 'create', errors, warnings,
    };

    if (!row.name) errors.push('Name is missing.');

    const price = parsePrice(row.priceRaw);
    if (price === null) errors.push(row.priceRaw ? `Price "${row.priceRaw}" is not a number.` : 'Price is missing.');
    else planned.price = price;

    if (!row.categoryRaw) errors.push('Category is missing.');
    else {
      // Every category we don't use is listed for mapping, even once mapped, so the choice can be changed.
      if (!resolveCategory(row.categoryRaw)) unknown.set(norm(row.categoryRaw), row.categoryRaw);
      const cat = resolveCategory(row.categoryRaw, opts.categoryMap);
      if (cat) planned.category = cat;
      else errors.push(`Category "${row.categoryRaw}" is not one we use. Pick one below.`);
    }

    const modeNames = splitList(row.modesRaw);
    const modes: string[] = [];
    modeNames.forEach(m => {
      const resolved = resolveMode(m);
      if (resolved) { if (!modes.includes(resolved)) modes.push(resolved); }
      else errors.push(`Service mode "${m}" is not recognized (use ${AUTHORIZED_SERVICE_MODES.join(', ')}).`);
    });
    planned.modes = modeNames.length ? modes : [...opts.defaultModes];

    const groupNames = splitList(row.modifiersRaw);
    if (groupNames.length) {
      planned.groupNames = groupNames;
      const ids: string[] = [];
      groupNames.forEach(g => {
        const r = resolveGroup(g);
        if ('error' in r) errors.push(r.error);
        else if (!ids.includes(r.id)) ids.push(r.id);
      });
      planned.groupIds = ids;
    }

    if (row.name) {
      const key = nameKey(row.name);
      if (seenInFile.has(key)) errors.push('This name appears earlier in the file. Only the first one is used.');
      seenInFile.add(key);
      const existing = existingByKey.get(key);
      if (existing) planned.existingId = existing.id;
    }

    if (errors.length) planned.action = 'error';
    else if (planned.existingId) planned.action = opts.existingPolicy === 'update' ? 'update' : 'skip';
    else planned.action = 'create';
    return planned;
  });

  // Groups worth writing: everything defined in the file, plus library groups that a row which will be written uses.
  const libraryKeysNeeded = new Set<string>();
  items.forEach(it => {
    if (it.action !== 'create' && it.action !== 'update') return;
    it.groupNames.forEach(n => { if (usedLibrary.has(nameKey(n))) libraryKeysNeeded.add(nameKey(n)); });
  });
  const plannedGroups = [
    ...groups.values(),
    ...Array.from(usedLibrary.entries()).filter(([k]) => libraryKeysNeeded.has(k)).map(([, g]) => g),
  ];

  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  items.forEach(i => { counts[i.action]++; });

  return {
    fileProblems: [],
    groups: plannedGroups,
    groupProblems,
    items,
    unknownCategories: Array.from(unknown.values()),
    counts,
  };
}
