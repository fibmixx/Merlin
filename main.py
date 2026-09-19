import json
import sys
import os
import random

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

file = os.path.join(BASE_DIR, "vocabulary.json")

def load_vocabulary():
    if not os.path.exists(file):
        return {"Default": {}}
    try:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if data else {"Default": {}}
    except json.JSONDecodeError:
        return {"Default": {}}

def save_vocabulary(vocabulary):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(vocabulary, f, indent=4, ensure_ascii=False)

def add_word(word, meaning, set_name, vocabulary):
    if set_name not in vocabulary:
        vocabulary[set_name] = {}
    if word in vocabulary[set_name]:
        print(f"{word} already exists in the '{set_name}' set.\n")
    else:
        vocabulary[set_name][word] = meaning
        print(f"{word} has been added to the '{set_name}' set.\n")

def delete_word(word, set_name, vocabulary):
    if set_name in vocabulary and word in vocabulary[set_name]:
        del vocabulary[set_name][word]
        print(f"{word} has been deleted from the '{set_name}' set.\n")
    else:
        print(f"{word} does not exist in the '{set_name}' set.\n")

def review_words(vocabulary, set_name=None):
    if not vocabulary:
        print("The vocabulary is empty.\n")
        return
    if set_name is None:
        for current_set, words in vocabulary.items():
            print(f"Reviewing words in the '{current_set}' set:")
            word_list = list(words.keys())
            random.shuffle(word_list)
            for word in word_list:
                input(f"What is the meaning of '{word}'? Press Enter to see the answer.")
                print(f"The meaning of '{word}' is: {words[word]}\n")
    else:
        if set_name not in vocabulary:
            print(f"The '{set_name}' set does not exist.\n")
            return
        words = list(vocabulary[set_name].keys())
        random.shuffle(words)
        for word in words:
            input(f"What is the meaning of '{word}'? Press Enter to see the answer.")
            print(f"The meaning of '{word}' is: {vocabulary[set_name][word]}\n")

def add_set(set_name, vocabulary):
    if set_name in vocabulary:
        print(f"The '{set_name}' set already exists.\n")
    else:
        vocabulary[set_name] = {}
        print(f"The '{set_name}' set has been created.\n")

def del_set(set_name, vocabulary):
    if set_name in vocabulary:
        del vocabulary[set_name]
        print(f"The '{set_name}' set has been deleted.\n")
    else:
        print(f"The '{set_name}' set does not exist.\n")

def main():
    vocabulary = load_vocabulary()
    while True:
        print("Vocabulary Learning App")
        print("1. Add a word")
        print("2. Delete a word")
        print("3. Review words")
        print("4. Add a set")
        print("5. Delete a set")
        print("6. Exit")
        choice = input("Enter your choice: ")
        if choice == "1":
            word = input("Enter the word: ")
            set_name = input("Enter the set name: ")
            meaning = input("Enter the meaning: ")
            add_word(word, meaning, set_name, vocabulary)
            save_vocabulary(vocabulary)
        elif choice == "2":
            word = input("Enter the word to delete: ")
            set_name = input("Enter the set name: ")
            delete_word(word, set_name, vocabulary)
            save_vocabulary(vocabulary)
        elif choice == "3":
            set_name = input("Enter the set name (or press Enter to review all): ")
            review_words(vocabulary, set_name if set_name else None)
        elif choice == "4":
            set_name = input("Enter the set name: ")
            add_set(set_name, vocabulary)
            save_vocabulary(vocabulary)
        elif choice == "5":
            set_name = input("Enter the set name to delete: ")
            del_set(set_name, vocabulary)
            save_vocabulary(vocabulary)
        elif choice == "6":
            print("Exiting the application. Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.\n")

if __name__ == "__main__":
    main()
# Definir que el main es main()