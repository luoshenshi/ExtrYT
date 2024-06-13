document.addEventListener("DOMContentLoaded", () => {
  const youtubeUrlInput = document.querySelector('.form-control[placeholder="YouTube Url"]');

  const ranges = [
    { range: document.getElementById("customRange1"), number: document.getElementById("customRange1Value") },
    { range: document.getElementById("customRange2"), number: document.getElementById("customRange2Value") },
    { range: document.getElementById("customRange3"), number: document.getElementById("customRange3Value") },
    { range: document.getElementById("customRange4"), number: document.getElementById("customRange4Value") }
  ];

  ranges.forEach(({ range, number }) => {
    range.addEventListener("input", () => { number.value = range.value; });
    number.addEventListener("input", () => { range.value = number.value; });
  });

  const downloadButton = document.querySelector(".btn.btn-primary");

  downloadButton.addEventListener("click", async () => {
    const youtubeUrl = youtubeUrlInput.value;
    const roomSize = ranges[0].range.value;
    const wetLevel = ranges[1].range.value;
    const dryLevel = ranges[2].range.value;
    const speed = ranges[3].range.value;

    if (youtubeUrl === "") return;

    Swal.fire({
      title: "Validating video",
      text: "Please wait...",
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => { Swal.showLoading(); }
    });

    try {
      const response = await fetch(`/videoInfo?url=${youtubeUrl}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const filename = data.title;

      Swal.fire({
        title: "Converting",
        text: "Please wait while we process the video...",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => { Swal.showLoading(); }
      });

      const headersList = { Accept: "*/*", "Content-Type": "application/json" };
      const bodyContent = JSON.stringify({ youtubeUrl, speed, roomSize, wetLevel, dryLevel });

      try {
        const downloadResponse = await fetch("/download", {
          method: "POST",
          body: bodyContent,
          headers: headersList
        });

        if (!downloadResponse.ok) {
          throw new Error("Network response was not ok");
        }

        const blob = await downloadResponse.blob();
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
