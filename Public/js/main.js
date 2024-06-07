document.addEventListener("DOMContentLoaded", () => {
  const youtubeUrlInput = document.querySelector(
    '.form-control[placeholder="YouTube Url"]'
  );

  const ranges = [
    {
      range: document.getElementById("customRange1"),
      number: document.getElementById("customRange1Value"),
    },
    {
      range: document.getElementById("customRange2"),
      number: document.getElementById("customRange2Value"),
    },
    {
      range: document.getElementById("customRange3"),
      number: document.getElementById("customRange3Value"),
    },
    {
      range: document.getElementById("customRange4"),
      number: document.getElementById("customRange4Value"),
    },
  ];

  ranges.forEach(({ range, number }) => {
    range.addEventListener("input", () => {
      number.value = range.value;
    });

    number.addEventListener("input", () => {
      range.value = number.value;
    });
  });

  const downloadButton = document.querySelector(".btn.btn-primary");

  downloadButton.addEventListener("click", async () => {
    const youtubeUrl = youtubeUrlInput.value;
    const roomSize = ranges[0].range.value;
    const wetLevel = ranges[1].range.value;
    const dryLevel = ranges[2].range.value;
    const speed = ranges[3].range.value;

    if (youtubeUrl == "") return;

    Swal.fire({
      title: "Validating video",
      text: "Please wait...",
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
    });

    let filename;
    try {
      filename = await fetch(`/videoInfo?url=${youtubeUrlInput.value}`)
        .then((response) => response.json())
        .then((data) => data.title);

      Swal.fire({
        title: "Converting",
        text: "Please wait while we process the video...",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
      });

      let headersList = {
        Accept: "*/*",
        "Content-Type": "application/json",
      };

      let bodyContent = JSON.stringify({
        youtubeUrl: youtubeUrl,
        speed: speed,
        roomSize: roomSize,
        wetLevel: wetLevel,
        dryLevel: dryLevel,
      });

      async function startDownloading() {
        try {
          let response = await fetch("http://localhost:3000/download", {
            method: "POST",
            body: bodyContent,
            headers: headersList,
          });

          if (!response.ok) {
            throw new Error("Network response was not ok");
          }

          let blob = await response.blob();
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${filename}.wav`;
          link.click();

          Swal.fire({
            title: "Downloading",
            text: "Your download will begin shortly...",
            icon: "success",
          });
        } catch (error) {
          console.error("Error downloading the file:", error);
          Swal.fire({
            title: "Error!",
            text: "There was an error downloading the file.",
            icon: "error",
            confirmButtonText: "OK",
          });
        }
      }

      startDownloading();
    } catch (error) {
      console.error("Error fetching video info:", error);
      Swal.fire({
        title: "Error!",
        text: "There was an error validating the video.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  });
});
