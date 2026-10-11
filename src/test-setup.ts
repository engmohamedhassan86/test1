/// <reference types="node" />
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

export const fs = {
  existsSync,
  readFileSync,
  readdirSync,
  join,
  resolve,
};
