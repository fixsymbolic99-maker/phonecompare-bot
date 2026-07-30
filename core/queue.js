class Queue {
  constructor() {
    this.tasks = [];
    this.isProcessing = false;
  }

  enqueue(task) {
    this.tasks.push(task);
    this.processNext();
  }

  processNext() {
    if (this.isProcessing || this.tasks.length === 0) return;
    this.isProcessing = true;
    const task = this.tasks.shift();
    task()
      .then(() => {
        this.isProcessing = false;
        this.processNext();
      })
      .catch(err => {
        console.error('Task failed:', err);
        this.isProcessing = false;
        this.processNext();
      });
  }

  clear() {
    this.tasks = [];
  }

  size() {
    return this.tasks.length;
  }
}

module.exports = new Queue();
