// Utility functions for parsing and categorizing Git data

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: Date;
  files: Array<{
    filename: string;
    insertions: number;
    deletions: number;
  }>;
  insertions: number;
  deletions: number;
}

export type CommitType = 'major-feature' | 'minor-feature' | 'bug-fix' | 'refactor' | 'architecture';

export function categorizeCommit(message: string, files: Array<{ filename: string }>): CommitType {
  const msg = message.toLowerCase();
  const fileCount = files.length;
  
  const hasArchFiles = files.some(f => 
    f.filename.includes('docker') || 
    f.filename.includes('config') || 
    f.filename.includes('migration') ||
    f.filename.includes('setup') ||
    f.filename.includes('infra') ||
    f.filename.includes('.yml') ||
    f.filename.includes('.yaml') ||
    f.filename.includes('package.json') ||
    f.filename.includes('requirements.txt')
  );

  // Architecture changes - major structural changes
  if (hasArchFiles || 
      msg.includes('migrate') || 
      msg.includes('architecture') || 
      msg.includes('infrastructure') || 
      msg.includes('docker') || 
      msg.includes('deploy') ||
      msg.includes('ci/cd') ||
      msg.includes('pipeline') ||
      fileCount > 15) {
    return 'architecture';
  }

  // Major features - significant new functionality
  if (msg.includes('feat:') || 
      msg.includes('feature:') ||
      msg.includes('add:') || 
      msg.includes('implement') || 
      msg.includes('launch') || 
      msg.includes('release') ||
      msg.includes('introduce') ||
      msg.match(/^(add|feat|feature)[\s:]/) ||
      fileCount > 8) {
    return 'major-feature';
  }

  // Bug fixes
  if (msg.includes('fix:') || 
      msg.includes('bug:') ||
      msg.includes('hotfix') ||
      msg.includes('patch') ||
      msg.includes('resolve') ||
      msg.match(/^(fix|bug|hotfix)[\s:]/)) {
    return 'bug-fix';
  }

  // Refactoring
  if (msg.includes('refactor:') || 
      msg.includes('optimize') || 
      msg.includes('improve') || 
      msg.includes('clean') || 
      msg.includes('restructure') || 
      msg.includes('update') ||
      msg.includes('rename') ||
      msg.match(/^(refactor|optimize|improve|update)[\s:]/)) {
    return 'refactor';
  }

  // Default to minor feature for everything else
  return 'minor-feature';
}

export const eventTypeLabels: Record<CommitType, string> = {
  'major-feature': 'Major Feature',
  'minor-feature': 'Minor Feature', 
  'bug-fix': 'Bug Fix',
  'refactor': 'Refactor',
  'architecture': 'Architecture'
};

export const eventTypeEmojis: Record<CommitType, string> = {
  'major-feature': '🚀',
  'minor-feature': '✏️',
  'bug-fix': '🐞', 
  'refactor': '🔧',
  'architecture': '🏗'
};
