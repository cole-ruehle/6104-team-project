<template>
    <div class="landing-page">
        <div class="landing-content">
            <div class="hero-section">
                <h1 class="hero-title">Welcome to ContactWeb: Your Professional Network, Unified</h1>
                <p class="hero-subtitle">
                    With <strong>ContactWeb</strong>, seamlessly connect, organize, and manage your entire professional network.<br>
                    Bring together relationships from LinkedIn, Instagram, Handshake, and more—all in one platform built by us, for you.
                </p>
            </div>

            <div class="features-section">
                <div class="feature-card">
                    <div class="feature-icon">🔗</div>
                    <h3>ContactWeb Multi-Source Connections</h3>
                    <p>
                        Effortlessly import and control contacts from several platforms using <strong>ContactWeb</strong>'s unified network hub.
                    </p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔍</div>
                    <h3>ContactWeb Smart Search</h3>
                    <p>
                        Instantly find and filter connections within your <strong>ContactWeb</strong> network using our fast, intelligent search.
                    </p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3>ContactWeb Network Insights</h3>
                    <p>
                        Visualize, explore, and understand your career network with <strong>ContactWeb</strong>'s interactive analytics.
                    </p>
                </div>
            </div>

            <div class="cta-section">
                <h2 class="cta-title">Ready to experience ContactWeb?</h2>
                <p class="cta-subtitle">
                    Join professionals everywhere who trust <strong>ContactWeb</strong> to manage their networks smarter.
                </p>
                <div class="cta-buttons">
                    <button @click="showLogin = true" class="cta-button primary">
                        Log In
                    </button>
                    <button
                        @click="showSignup = true"
                        class="cta-button secondary"
                    >
                        Sign Up
                    </button>
                </div>
            </div>
        </div>

        <!-- Login Modal -->
        <LoginModal v-if="showLogin" @close="showLogin = false" />

        <!-- Signup Modal -->
        <SignupModal v-if="showSignup" @close="showSignup = false" />
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import LoginModal from "@/components/LoginModal.vue";
import SignupModal from "@/components/SignupModal.vue";

const showLogin = ref(false);
const showSignup = ref(false);
</script>

<style scoped>
.landing-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: white;
}

.landing-content {
    max-width: 1200px;
    width: 100%;
    text-align: center;
}

.hero-section {
    margin-bottom: 4rem;
}

.hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    margin: 0 0 1.5rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
}

.hero-subtitle {
    font-size: 1.25rem;
    margin: 0;
    opacity: 0.9;
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
}

.features-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 4rem;
}

.feature-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1rem;
    padding: 2rem;
    transition: transform 0.3s ease, background 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-5px);
    background: rgba(255, 255, 255, 0.15);
}

.feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.feature-card h3 {
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    font-weight: 700;
}

.feature-card p {
    margin: 0;
    opacity: 0.9;
    line-height: 1.6;
}

.cta-section {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1.5rem;
    padding: 3rem 2rem;
}

.cta-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
}

.cta-subtitle {
    font-size: 1.125rem;
    margin: 0 0 2rem;
    opacity: 0.9;
}

.cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

.cta-button {
    padding: 1rem 2.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 150px;
}

.cta-button.primary {
    background: white;
    color: var(--color-navy-900);
}

.cta-button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(255, 255, 255, 0.3);
}

.cta-button.secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
}

.cta-button.secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
}

@media (max-width: 768px) {
    .hero-title {
        font-size: 2.5rem;
    }

    .hero-subtitle {
        font-size: 1.125rem;
    }

    .features-section {
        grid-template-columns: 1fr;
    }

    .cta-buttons {
        flex-direction: column;
    }

    .cta-button {
        width: 100%;
    }
}
</style>

