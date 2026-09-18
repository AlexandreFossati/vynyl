<script lang="ts">
  import DashboardPage from './components/pages/DashboardPage.svelte';
  import NotFoundPage from './components/pages/NotFoundPage.svelte';
  import Header from './components/organisms/Header.svelte';
  import AppShell from './components/templates/AppShell.svelte';
  import { router } from './lib/router.svelte';
</script>

<AppShell>
  {#snippet header()}
    <Header title="Product Catalog" />
  {/snippet}

  {#if router.path === '/'}
    <DashboardPage />
  {:else}
    <NotFoundPage />
  {/if}
</AppShell>
