<template>
  <div class="pa-4">
    <div class="text-h5 mb-4 d-flex align-center">
      <v-icon class="me-2">mdi-tools</v-icon>
      Utilities
    </div>

    <v-row>
      <v-col cols="12" md="6" lg="4">
        <v-card to="/utilities/duplicates" class="d-flex flex-column" hover>
          <v-card-title>
            <v-icon class="me-2">mdi-content-duplicate</v-icon>
            Duplicate Finder
          </v-card-title>
          <v-card-text class="text-medium-emphasis">
            Find likely duplicate photos even with different file names using CLIP and phash.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
// @ts-ignore
definePageMeta({ middleware: ['setup','auth'] })
</script>
