import { describe, it, expect } from 'vitest';
import { grabFields } from '../src/index';

const source = {
  handle: 'toreilly317',
  company: 'ACME INC.',
  githubusername: 'MySuperAwesomeUsername',
  website: 'www.example.com',
  bio: 'Hello World',
  status: 'Developer',
  skills: 'eating,sleeping,drinking coffee,coding',
  facebook: 'facebook.com',
  youtube: 'youtube.com',
  twitter: 'twitter.com/TwitterUserName',
  instagram: 'instagram.com/MyInstagramName',
  linkedin: 'linkedin.com',
};

describe('grabFields', () => {
  describe('string spec', () => {
    it('copies a field as-is', () => {
      expect(grabFields(source, ['handle'])).toEqual({ handle: 'toreilly317' });
    });

    it('copies multiple fields', () => {
      expect(grabFields(source, ['handle', 'company', 'bio'])).toEqual({
        handle: 'toreilly317',
        company: 'ACME INC.',
        bio: 'Hello World',
      });
    });
  });

  describe('rename spec [newName, sourceField]', () => {
    it('renames a field', () => {
      expect(grabFields(source, [['customField', 'twitter']])).toEqual({
        customField: 'twitter.com/TwitterUserName',
      });
    });
  });

  describe('transform spec [fieldName, fn]', () => {
    it('transforms a field value', () => {
      const result = grabFields(source, [
        ['skills', (v) => String(v).split(',')],
      ]);
      expect(result).toEqual({
        skills: ['eating', 'sleeping', 'drinking coffee', 'coding'],
      });
    });
  });

  describe('rename + transform spec [newName, sourceField, fn]', () => {
    it('renames and transforms a field', () => {
      const result = grabFields(source, [
        ['formattedSkills', 'skills', (v) => String(v).split(',')],
      ]);
      expect(result).toEqual({
        formattedSkills: ['eating', 'sleeping', 'drinking coffee', 'coding'],
      });
    });
  });

  describe('nested spec', () => {
    it('creates a nested object with string specs', () => {
      const result = grabFields(source, [
        { name: 'social', wantedFields: ['facebook', 'linkedin'] },
      ]);
      expect(result).toEqual({
        social: { facebook: 'facebook.com', linkedin: 'linkedin.com' },
      });
    });

    it('supports transforms inside nested specs', () => {
      const result = grabFields(source, [
        {
          name: 'social',
          wantedFields: [
            'facebook',
            ['instagram', (v) => `@${String(v).split('/')[1]}`],
          ],
        },
      ]);
      expect(result).toEqual({
        social: {
          facebook: 'facebook.com',
          instagram: '@MyInstagramName',
        },
      });
    });

    it('supports deeply nested specs', () => {
      const result = grabFields(source, [
        {
          name: 'social',
          wantedFields: [
            {
              name: 'twitter',
              wantedFields: [
                ['username', 'twitter', (v) => String(v).split('/')[1]],
                ['link', 'twitter'],
              ],
            },
          ],
        },
      ]);
      expect(result).toEqual({
        social: {
          twitter: {
            username: 'TwitterUserName',
            link: 'twitter.com/TwitterUserName',
          },
        },
      });
    });
  });

  describe('edge cases', () => {
    it('returns empty object for empty specs', () => {
      expect(grabFields(source, [])).toEqual({});
    });
  });

  describe('onMissing: throw (default)', () => {
    it('throws on missing string field', () => {
      expect(() => grabFields({}, ['handle'])).toThrow(
        "Missing field 'handle' in source object (spec: 'handle')",
      );
    });

    it('throws on missing rename source field', () => {
      expect(() => grabFields({}, [['alias', 'handle']])).toThrow(
        "Missing field 'handle' in source object (spec: ['alias', 'handle'])",
      );
    });

    it('throws on missing transform field', () => {
      expect(() => grabFields({}, [['skills', (v) => v]])).toThrow(
        "Missing field 'skills' in source object (spec: ['skills', fn])",
      );
    });

    it('throws on missing rename+transform source field', () => {
      expect(() => grabFields({}, [['x', 'skills', (v) => v]])).toThrow(
        "Missing field 'skills' in source object (spec: ['x', 'skills', fn])",
      );
    });

    it('throws on missing field inside nested spec', () => {
      expect(() =>
        grabFields({}, [{ name: 'group', wantedFields: ['handle'] }]),
      ).toThrow("Missing field 'handle' in source object (spec: 'handle')");
    });

    it('wraps transform errors with spec context', () => {
      expect(() =>
        grabFields(source, [
          ['handle', () => { throw new Error('boom'); }],
        ]),
      ).toThrow("Transform failed for spec ['handle', fn]: boom");
    });
  });

  describe('onMissing: undefined', () => {
    it('returns undefined for missing fields', () => {
      expect(grabFields({}, ['handle'], { onMissing: 'undefined' })).toEqual({
        handle: undefined,
      });
    });

    it('passes undefined to transform for missing fields', () => {
      const result = grabFields({}, [['x', (v) => v ?? 'default']], {
        onMissing: 'undefined',
      });
      expect(result).toEqual({ x: 'default' });
    });
  });

  describe('onMissing: skip', () => {
    it('omits missing fields from result', () => {
      const result = grabFields({}, ['handle', 'company'], {
        onMissing: 'skip',
      });
      expect(result).toEqual({});
    });

    it('includes fields that exist and skips those that do not', () => {
      const result = grabFields(
        { handle: 'test' },
        ['handle', 'company'],
        { onMissing: 'skip' },
      );
      expect(result).toEqual({ handle: 'test' });
    });

    it('skips missing rename source fields', () => {
      const result = grabFields({}, [['alias', 'handle']], {
        onMissing: 'skip',
      });
      expect(result).toEqual({});
    });

    it('skips missing transform fields', () => {
      const result = grabFields({}, [['x', (v) => v]], {
        onMissing: 'skip',
      });
      expect(result).toEqual({});
    });

    it('skips missing rename+transform fields', () => {
      const result = grabFields({}, [['x', 'y', (v) => v]], {
        onMissing: 'skip',
      });
      expect(result).toEqual({});
    });
  });

  describe('integration', () => {
    it('handles mixed spec types (mirrors original wantedFields.js)', () => {
      const result = grabFields(source, [
        'handle',
        'company',
        'website',
        'bio',
        'status',
        'githubusername',
        ['skills', (v) => String(v).split(',')],
        ['formattedSkills', 'skills', (v) => String(v).split(',')],
        {
          name: 'social',
          wantedFields: [
            'facebook',
            ['instagram', (v) => `@${String(v).split('/')[1]}`],
            ['customField', 'twitter'],
            {
              name: 'twitter',
              wantedFields: [
                ['username', 'twitter', (v) => String(v).split('/')[1]],
                ['link', 'twitter'],
              ],
            },
          ],
        },
      ]);

      expect(result).toEqual({
        handle: 'toreilly317',
        company: 'ACME INC.',
        website: 'www.example.com',
        bio: 'Hello World',
        status: 'Developer',
        githubusername: 'MySuperAwesomeUsername',
        skills: ['eating', 'sleeping', 'drinking coffee', 'coding'],
        formattedSkills: ['eating', 'sleeping', 'drinking coffee', 'coding'],
        social: {
          facebook: 'facebook.com',
          instagram: '@MyInstagramName',
          customField: 'twitter.com/TwitterUserName',
          twitter: {
            username: 'TwitterUserName',
            link: 'twitter.com/TwitterUserName',
          },
        },
      });
    });
  });
});
