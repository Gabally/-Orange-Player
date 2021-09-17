<template>
  <div id="app">
    <div id="topBar">
      OrangePlayer
      <div style="display: flex;">
        <div class="topButton" style="margin-right: 30px;" @click="deleteActive = !deleteActive">
        🗑️
        </div>  
        <div class="topButton" @click="addNewSong">
          🎵
        </div>
      </div>
    </div>
    <div id="songs">
      <SongCard
        :image="`file:///${dataPath}/${song.id}.jpg`"
        :title="song.title"
        :id="song.id"
        :showDelete="deleteActive"
        :isPlaying="currentSong && currentSong.id === song.id"
        v-for="(song, index) in songsData.songs"
        :key="index"
        v-on:click.native="playSong(song.id)"
        v-on:deleteclick="deleteSong(song.id)"
      />
    </div>
    <div id="player">
      <input type="range" name="seekbar" min="0" :max="songDuration" id="seekBar" ref="seekBar" @input="seekTime">
      <div v-if="currentSong" class="playerText songTitle">
        {{ currentSong.title }}
      </div>
      <div v-else class="playerText songTitle">
        No song
      </div>
      <div v-if="!isPaused" class="playerControl center" @click="pauseAudio">
        ⏸️
      </div>
      <div v-if="isPaused" class="playerControl center" @click="playAudio">
        ▶️
      </div>
      <div id="voluleContainer" v-if="showVolumeSlider">
        <input type="range"  name="volume" min="1" max="100" id="volumeSlider" ref="volumeSlider" v-model="tmpVol" @input="liveUpdateVolume" @change="updateSongsData">
      </div>
      <div id="audioButton" class="playerControl" @click="showVolumeSlider = !showVolumeSlider">
        🔊
      </div>
      <div class="playerText timeStamp">
        {{ currentTimestamp }}
      </div>
    </div>
  </div>
</template>

<script>
import SongCard from "@/components/SongCard.vue";

export default {
  name: "App",
  data() {
    return {
      dataPath: window.dataPath,
      currentTimestamp: "00:00:00",
      songDuration: 0,
      tmpVol: 0,
      isPaused: true,
      deleteActive: false,
      showVolumeSlider: false,
      currentSong: undefined,
      player: new Audio(),
      songsData: {
        songs: [],
        volume: 0.5
      },
    };
  },
  components: {
    SongCard,
  },
  methods: {
    async fetchText(url) {
      let resp = await fetch(url);
      return await resp.text();
    },
    async fetchJSON(url) {
      let resp = await fetch(url);
      return await resp.json();
    },
    async fetchBuffer(url) {
      let resp = await fetch(url);
      return await resp.arrayBuffer();
    },
    async writeFile(filename, data) {
      return new Promise((resolve) => {
        window.ipcRenderer.on("mainprocess-file-written", (event, arg) => {
          if (arg.fileName === filename) {
            resolve();
          }
        });
        window.ipcRenderer.send("request-mainprocess-file-write", {
          fileName: filename,
          data: data,
        });
      });
    },
    async deleteFile(filename) {
      return new Promise((resolve, reject) => {
        try {
          window.ipcRenderer.on("mainprocess-file-deleted", (event, arg) => {
            if (arg === filename) {
              resolve();
            }
          });
          window.ipcRenderer.send("request-mainprocess-file-delete", filename);
        } catch(e) {
          reject(e);
        }
      });
    },
    async readSongsData() {
      return new Promise((resolve) => {
        window.ipcRenderer.on(
          "mainprocess-song-data-read",
          async (event, arg) => {
            resolve(arg);
          }
        );
        window.ipcRenderer.send("request-mainprocess-song-data", {});
      });
    },
    async updateSongsData() {
      return new Promise((resolve) => {
        window.ipcRenderer.on(
          "mainprocess-song-data-updated",
          async (event, arg) => {
            resolve();
          }
        );
        window.ipcRenderer.send(
          "request-mainprocess-song-data-update",
          this.songsData
        );
      });
    },
    parseDocument(html) {
      let parser = new DOMParser();
      return parser.parseFromString(html, "text/html");
    },
    isValidHttpUrl(string) {
      let url;
      try {
        url = new URL(string);
      } catch (_) {
        return false;
      }
      return url.protocol === "http:" || url.protocol === "https:";
    },
    uuidv4() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    },
    async getYTVideoData(link) {
      let id = link.match(
        /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\/?\?v=|\/embed\/|\/)([^\s&?/#]+)/
      )[1];
      let html = await this.fetchText(
        `https://www.yt-download.org/api/button/mp3/${id}`
      );
      let htmlDoc = this.parseDocument(html);
      let vidoeData = await this.fetchJSON(
        `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${id}&format=json`
      );
      return {
        title: vidoeData.title,
        download: htmlDoc.querySelector("a").href,
        artwork: `http://img.youtube.com/vi/${id}/hqdefault.jpg`,
      };
    },
    async getSCTrackData(link) {
      let html = await this.fetchText(link);
      let htmlDoc = this.parseDocument(html);
      let hydration = {};
      let scripts = htmlDoc.querySelectorAll("script");
      for (let i = 0; i < scripts.length; i++) {
        let script = scripts[i].innerHTML;
        if (script.includes("window.__sc_hydration = ")) {
          let pos = script.lastIndexOf(";");
          script = script.substring(0, pos) + script.substring(pos + 1);
          hydration = JSON.parse(
            script.replace("window.__sc_hydration = ", "")
          );
          hydration = hydration[6];
          break;
        }
      }
      let htmlSCDownload = await this.fetchText(
        `https://soundcloudtomp3.app/download/?url=${encodeURIComponent(link)}`
      );
      let soundCloudDownloadPage = this.parseDocument(htmlSCDownload);
      return {
        artwork: hydration.data.artwork_url,
        download: soundCloudDownloadPage.querySelectorAll("a")[9].href,
        title: hydration.data.title,
      };
    },
    async addNewSong() {
      let url = await this.$smalltalk.prompt(
        "Download a new song:",
        "Song URL"
      );
      if (url.length !== 0) {
        let parsedURL = new URL(url);
        let song = null;
        if (parsedURL.hostname === "soundcloud.com") {
          song = await this.getSCTrackData(url);
        } else if (parsedURL.hostname === "www.youtube.com") {
          song = await this.getYTVideoData(url);
        }
        if (song !== null) {
          let id = this.uuidv4();
          let songMp3 = await this.fetchBuffer(song.download);
          let songArtWork = await this.fetchBuffer(song.artwork);
          let songTitle = await this.$smalltalk.prompt(
            "Song downloaded!",
            "Edit the title:",
            song.title
          );
          if (!songTitle || songTitle.length === 0) {
            songTitle = song.title;
          }
          await this.writeFile(`${id}.mp3`, songMp3);
          await this.writeFile(`${id}.jpg`, songArtWork);
          this.songsData.songs.push({
            title: songTitle,
            id: id,
          });
          this.updateSongsData();
        }
      }
    },
    playSong(id) {
      this.currentSong = this.songsData.songs.find(s => s.id === id);
      this.player.pause();
      this.player = new Audio(`file:///${this.dataPath}/${this.currentSong.id}.mp3`);
      this.player.volume = this.songsData.volume;
      this.player.play();
      setTimeout(() => {
        this.songDuration = this.player.duration;
      }, 200);
      this.isPaused = false;
      this.player.addEventListener("timeupdate", () => {
        this.currentTimestamp = new Date(this.player.currentTime * 1000).toISOString().substr(11, 8);
        this.$refs.seekBar.value = this.player.currentTime;
      });
      this.player.addEventListener("pause", () => { this.isPaused = true });
      this.player.addEventListener("play", () => { this.isPaused = false });
      this.player.addEventListener("ended", () =>  {
        let index = this.songsData.songs.findIndex(s => s.id === this.currentSong.id);
        if (index === this.songsData.songs.length - 1) {
          index = 0;
        } else {
          index++;
        }
        this.playSong(this.songsData.songs[index].id);
      });
    },
    playAudio() {
      this.player.play();
      this.isPaused = false;
    },
    pauseAudio() {
      this.player.pause();
      this.isPaused = true;
    },
    async deleteSong(id) {
      try {
        this.songsData.songs = this.songsData.songs.filter(s => s.id !== id);
        await this.deleteFile(`${id}.mp3`);
        await this.deleteFile(`${id}.jpg`);
        await this.updateSongsData();
      } catch (error) {
        console.error(error);
        await this.$smalltalk.alert("An error occoured while deleting the song", JSON.stringify(error));
      }
    },
    seekTime() {
      this.player.currentTime = this.$refs.seekBar.value;
    },
    liveUpdateVolume() {
      this.songsData.volume = this.$refs.volumeSlider.value / 100;
      this.player.volume = this.songsData.volume;
    }
  },
  async mounted() {
    this.songsData = await this.readSongsData();
    this.tmpVol = this.songsData.volume * 100;
  }
};
/*
      let hlsGetterUrl = `${hydration.data.media.transcodings[0].url}?client_id=U5LTZLyHCTli23KWKwRh0XXtNd2vDq8f`;
      let signedHlsUrlObject = await this.fetchJSON(hlsGetterUrl);
      let hlsPlayListFile = await this.fetchText(signedHlsUrlObject.url);
      console.log(hlsPlayListFile);
      let mediaUrls = hlsPlayListFile.split("\n").filter(text => this.isValidHttpUrl(text));
      mediaUrls.forEach(url => {
        console.log(url);
      });
      let crunker = new this.$crunker();
      let buffers = await crunker.fetchAudio(...mediaUrls);
      let concatenated = await crunker.concatAudio(buffers);
      let {blob, element, url} = await crunker.export(concatenated, "audio/mp3");
      console.log(url);
      crunker.download(blob);
      */
</script>

<style>
@import url("assets/GloryFont.css");
:root {
  --main-orange: hsl(29, 77%, 46%);
  --main-bg: 
  hsl(210, 3%, 12%);
}
* {
  font-family: "glorythin";
}
body {
  background: var(--main-bg);
  margin: 0px;
  outline: none;
  border: 0px;
}
#app {
  font-size: 23px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: white;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
#topBar {
  display: flex;
  align-items: middle;
  padding: 15px;
  background: var(--main-orange);
  height: 30px;
  border-bottom: 2px solid rgb(224, 83, 17);
  justify-content: space-between;
  align-items: center;
}
#songs {
  flex-grow: 1;
  overflow-y: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
#songs::-webkit-scrollbar {
  display: none;
}
#player {
  height: 110px;
  padding-left: 30px;
  padding-right: 30px;
  position: relative;
  display: table;
}
.playerControl {
  padding: 10px;
  padding-bottom: 13px;
  border-radius: 50%;
  border: 2px solid black;
  user-select: none;
  cursor: pointer;
  font-size: 32px;
  transition: all ease-in-out 60ms;
}
.playerControl:hover {
  box-shadow: 5px 5px 5px rgba(41, 40, 40, 0.938);
}
.playerControl:active {
  background: rgba(41, 40, 40, 0.753);
}
.topButton {
  width: 40px;
  height: 40px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  border-radius: 50%;
  border: 2px solid black;
  transition: all ease-in-out 50ms;
  display: flex;
  justify-content: center;
  align-items: center;
}
.topButton:hover {
  box-shadow: 2px 2px 2px 2px rgb(46, 46, 46);
}
.topButton:active {
  transform: translateY(2px);
}
.playerText {
  font-size: 21px;
}
.songTitle {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
}
.center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
#audioButton {
  position: absolute;
  left: 72%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.timeStamp {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}
#seekBar {
  position: absolute;
  top: -1px;
  left: -2px;
  width: 100%;
}
#voluleContainer {
  position: absolute;
  z-index: 9999;
  background: white;
  left: 72%;
  top: -70px;
  transform: translateX(-50%)rotate(-90deg);
  border-radius: 5px;
  border: 2px solid rgb(219, 219, 219);
}
</style>