<template>
  <div class="profile-page">
    <section class="profile-actions card">
      <h2 style="margin-top: 0">Profile actions</h2>
      <p class="muted">Manage your public profile.</p>
      <div class="action-buttons">
        <button type="button" @click="showCreateModal = true">
          Create Profile
        </button>
        <button type="button" @click="showUpdateModal = true">
          Update Profile
        </button>
      </div>
    </section>

    <section class="profile-main card">
      <div class="search-hero">
        <RouterLink class="network-button" to="/network"
          >View My Network</RouterLink
        >
        <form class="search-form" @submit.prevent="searchConnections">
          <input
            class="search-input"
            v-model.trim="inspectUser"
            :disabled="inspectLoading"
            placeholder="Describe the connection you're looking for..."
            required
          />
          <button type="submit" :disabled="inspectLoading">
            {{ inspectLoading ? "Searching" : "Search" }}
          </button>
        </form>
      </div>

      <StatusBanner
        v-if="banner && banner.section === 'inspect'"
        :type="banner.type"
        :message="banner.message"
      />

      <p v-if="inspectResult" class="muted" style="margin: 0.75rem 0">
        {{ inspectResult }}
      </p>

      <div v-if="connectionResults.length" class="connection-results">
        <article
          v-for="result in connectionResults"
          :key="result.connectionId"
          class="connection-card"
        >
          <header class="connection-card__header">
            <div>
              <h3>{{ connectionDisplayName(result.connection) }}</h3>
              <p class="muted" v-if="result.connection?.headline">
                {{ result.connection?.headline }}
              </p>
            </div>
            <span class="score-pill">{{ result.score.toFixed(3) }}</span>
          </header>
          <p
            v-if="
              result.connection?.currentPosition ||
              result.connection?.currentCompany
            "
          >
            {{ result.connection?.currentPosition || "" }}
            <template v-if="result.connection?.currentCompany"> </template>
          </p>
        </article>
      </div>
    </section>
  </div>
</template>
