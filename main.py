import json
import os
import random
import flask

file = "vocabulary.json"

def load_vocabulary():
    if not os.path.exists(file):
        return {}
    try:
        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        # Si el archivo está vacío o corrupto, empieza con un dict vacío
        return {}


def save_vocabulary(vocabulary):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(vocabulary, f, indent=4)

def add_word(word, meaning, vocabulary):
    if word in vocabulary:
        print(f"{word} already exists in the vocabulary.\n")
    else:
        vocabulary[word] = meaning
        print(f"{word} has been added to the vocabulary.\n")

def delete_word(word, vocabulary):
    if word in vocabulary:
        del vocabulary[word]
        print(f"{word} has been deleted from the vocabulary.\n")
    else:
        print(f"{word} does not exist in the vocabulary.\n")

def review_words(vocabulary):
    if not vocabulary:
        print("The vocabulary is empty.\n")
        return
    words = list(vocabulary.keys())
    random.shuffle(words)
    for word in words:
        input(f"What is the meaning of '{word}'? Press Enter to see the answer.")
        print(f"The meaning of '{word}' is: {vocabulary[word]}\n")

def main():
    vocabulary = load_vocabulary()
    while True:
        print("Vocabulary Learning App")
        print("1. Add a word")
        print("2. Delete a word")
        print("3. Review words")
        print("4. Exit")
        choice = input("Enter your choice: ")
        if choice == "1":
            word = input("Enter the word: ")
            meaning = input("Enter the meaning: ")
            add_word(word, meaning, vocabulary)
            save_vocabulary(vocabulary)
        elif choice == "2":
            word = input("Enter the word to delete: ")
            delete_word(word, vocabulary)
            save_vocabulary(vocabulary)
        elif choice == "3":
            review_words(vocabulary)
        elif choice == "4":
            break
        else:
            print("Invalid choice. Please try again.\n")

if __name__ == "__main__":
    main()
# Definir que el main es main()