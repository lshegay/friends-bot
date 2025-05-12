export class MessageBroker<T> {
  private messages: T[] = [];

  // Add data to the array
  addMessage(message: T): T {
    this.messages.push(message);

    return message;
  }

  // Get and remove data from the array
  getMessage(): T | undefined {
    return this.messages.shift();
  }

  getMessages(): T[] {
    const messages = [...this.messages];
    this.messages = [];

    return messages;
  }

  // Remove specific data from the array
  removeMessage(message: T): boolean {
    const index = this.messages.indexOf(message);
    if (index !== -1) {
      this.messages.splice(index, 1);
      return true;
    }
    return false;
  }
}