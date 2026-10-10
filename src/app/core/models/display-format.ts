/**
 * Respondent-facing formatting of two contract values — FR-071 and FR-072.
 *
 * These live in `models` rather than `validators` because they are properties of the
 * domain: neither decides valid or invalid (plan §5.1).
 */

import type { AcceptedFileType } from './survey.model';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

/** One decimal place at most, with a trailing `.0` dropped. */
function trimDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

/**
 * FR-071: binary units, at most one decimal place. Below 1024 as `N bytes`, below
 * 1048576 as kilobytes, otherwise megabytes, trailing `.0` omitted. So `800` → `800
 * bytes`, `240000` → `234.4 KB`, `1048576` → `1 MB`, `5242880` → `5 MB`.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_KB) {
    return `${bytes} bytes`;
  }
  if (bytes < BYTES_PER_MB) {
    return `${trimDecimal(bytes / BYTES_PER_KB)} KB`;
  }
  return `${trimDecimal(bytes / BYTES_PER_MB)} MB`;
}

/** A MIME type as its uppercased subtype; an extension as its uppercased extension. */
function typeLabel(type: AcceptedFileType): string {
  if (type.startsWith('.')) {
    return type.slice(1).toUpperCase();
  }
  const subtype = type.slice(type.indexOf('/') + 1);
  return subtype.toUpperCase();
}

/**
 * FR-072: display labels, not raw contract values, joined with `, ` in config order with
 * duplicate labels collapsed. So `["image/png","image/jpeg","application/pdf"]` renders
 * `PNG, JPEG, PDF`.
 */
export function formatAcceptedTypes(types: readonly AcceptedFileType[]): string {
  const labels: string[] = [];
  for (const type of types) {
    const label = typeLabel(type);
    if (!labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels.join(', ');
}
