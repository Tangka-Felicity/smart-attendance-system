// Ambient typing for Expo public env vars (EXPO_PUBLIC_*), inlined by
// babel-preset-expo at build time. Declared here so we can reference the
// literal `process.env.EXPO_PUBLIC_API_URL` member expression (required for
// inlining) without pulling in @types/node.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};
