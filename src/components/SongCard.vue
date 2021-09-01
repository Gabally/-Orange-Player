<template>
  <div id="songCard" v-bind:class="{ marked: isPlaying }">
    <div id="songInfo">
      <img id="thumbnail" :src="image" alt="">
      <div id="songTitle">{{ title }}</div>
    </div>
    <img v-if="showDelete" id="deleteButton" v-on:click.stop="$emit('deleteclick')" src="@/assets/delete.png" alt="">
  </div>
</template>

<script>
export default {
  name: 'SongCard',
  props: {
    image: String,
    title: String,
    id: String,
    showDelete: Boolean,
    isPlaying: Boolean
  }
}
</script>

<style scoped>
#songCard {
    width: 100%;
    height: 85px;
    display: flex;
    justify-content: space-between;
    border: 1px solid rgb(199, 102, 22);
    padding: 5px;
    cursor: pointer;
    transition: 60ms ease-in-out all;
    font-size: 19px;
}
#songCard:hover {
  transform: translateX(2px);
  background: hsl(28, 44%, 25%);
}
#thumbnail {
    width: 120px;
    height: 85px;
    object-fit: contain;
    border-radius: 10px;
    margin-left: 10px;
}
#deleteButton {
    cursor: pointer;
    height: 60%;
    border-radius: 50%;
    padding: 5px;
}
#deleteButton:hover {
    background: rgb(184, 42, 42);
}
#songInfo {
    display: flex;
    align-items: center;
}
#songTitle {
    margin-left: 15px;
}
.marked {
  background: rgb(160, 85, 24);
}
</style>
