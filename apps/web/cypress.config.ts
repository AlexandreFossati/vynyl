import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Cypress also honours the CYPRESS_BASE_URL environment variable to override this value.
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
  },
});
