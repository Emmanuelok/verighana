'use client';

import {createAuthClient} from '@neondatabase/auth/next';

// The managed SDK uses the same-origin /api/auth proxy and HTTP-only session cookies.
export const fullviewAuthClient = createAuthClient();
