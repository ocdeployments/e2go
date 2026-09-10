'use strict';

// RS-5 (Gap G-16): supabase-js never throws — a query naming a bad column,
// hitting RLS, or timing out returns `data: null` plus an `error`, which is
// indistinguishable from a genuine empty result unless `error` is checked.
// This is the exact pattern that shipped Sprint S's 44 broken queries.

const SUPABASE_METHOD_MARKERS = new Set(['from', 'rpc', 'auth', 'storage', 'functions']);

function collectChainMemberNames(node, names) {
  if (!node) return;
  if (node.type === 'CallExpression') {
    collectChainMemberNames(node.callee, names);
    return;
  }
  if (node.type === 'MemberExpression') {
    if (!node.computed && node.property.type === 'Identifier') {
      names.push(node.property.name);
    }
    collectChainMemberNames(node.object, names);
  }
}

function looksLikeSupabaseCall(node) {
  const names = [];
  collectChainMemberNames(node, names);
  return names.some((name) => SUPABASE_METHOD_MARKERS.has(name));
}

module.exports = {
  rules: {
    'require-supabase-error-check': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require binding `error` when destructuring the result of a Supabase client call.',
        },
        schema: [],
        messages: {
          missingErrorBinding:
            "Destructuring '{{ props }}' from a Supabase call without binding 'error' hides a failed query as an empty result. Bind and check 'error'.",
        },
      },
      create(context) {
        return {
          VariableDeclarator(node) {
            if (node.id.type !== 'ObjectPattern') return;
            if (!node.init || node.init.type !== 'AwaitExpression') return;
            if (!looksLikeSupabaseCall(node.init.argument)) return;

            const properties = node.id.properties.filter((p) => p.type === 'Property');
            const hasData = properties.some(
              (p) => !p.computed && p.key.type === 'Identifier' && p.key.name === 'data'
            );
            const hasError = properties.some(
              (p) => !p.computed && p.key.type === 'Identifier' && p.key.name === 'error'
            );

            if (hasData && !hasError) {
              context.report({
                node,
                messageId: 'missingErrorBinding',
                data: { props: properties.map((p) => p.key.name).join(', ') },
              });
            }
          },
        };
      },
    },
  },
};
