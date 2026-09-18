<script lang="ts">
  import Input from '../atoms/Input.svelte';

  interface Props {
    // What is typed, updated on every keystroke.
    value?: string;
    // Called with the text once the user has stopped typing for `delayMs`.
    onsearch: (term: string) => void;
    delayMs?: number;
  }

  let { value = $bindable(''), onsearch, delayMs = 300 }: Props = $props();

  const id = $props.id();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule(term: string) {
    clearTimeout(timer);
    timer = setTimeout(() => onsearch(term), delayMs);
  }

  // A pending search must not fire after the component is gone.
  $effect(() => () => clearTimeout(timer));
</script>

<div class="search" role="search">
  <label class="visually-hidden" for={id}>Search products</label>
  <Input
    {id}
    type="search"
    placeholder="Search products"
    maxlength={100}
    autocomplete="off"
    bind:value
    oninput={(event) => schedule(event.currentTarget.value)}
  />
</div>

<style>
  .search {
    width: 100%;
  }

  @media (min-width: 640px) {
    .search {
      max-width: 24rem;
    }
  }
</style>
