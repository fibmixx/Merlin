import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import random
import sys
import os

from main import load_vocabulary, save_vocabulary

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class VocabApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Merlin")
        self.root.geometry("1600x900")
        self.root.minsize(1280, 720)

        # Load vocabulary from the JSON file
        self.vocabulary = load_vocabulary()
        self.current_deck = []
        self.current_word = None
        self.showing_meaning = False

        # Style configuration
        self.setup_styles()

        # Load images for the application
        self.icon_image = None
        self.avatar_image = None
        self.setup_images()

        # Main Layout
        self.create_widgets()
        self.refresh_sets()

        # Welcome message
        self.merlin_say("Greetings! I am Merlin. Choose a set from the dropdown or pick an action from my grimoire to start!")

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        # Sidebar action buttons
        style.configure(
            "Sidebar.TButton",
            font=("Segoe UI", 12, "bold"),
            padding=(15, 12)
        )

        # Card action buttons
        style.configure(
            "CardAction.TButton",
            font=("Segoe UI", 14, "bold"),
            padding=(20, 16)
        )

        # Large combobox dropdown
        style.configure(
            "TCombobox",
            font=("Segoe UI", 13),
            padding=8
        )

        # Sidebar container label
        style.configure(
            "Sidebar.TLabelframe.Label",
            font=("Segoe UI", 13, "bold"),
            foreground="#2c3e50"
        )

    def setup_images(self):
        icon_path = os.path.join(BASE_DIR, "MerlinAPP.png")
        if os.path.exists(icon_path):
            try:
                # Window icon
                self.icon_image = tk.PhotoImage(file=icon_path)
                self.root.iconphoto(False, self.icon_image)

                # Downscale 512x512 image to 128x128 (subsample 4x4)
                self.avatar_image = self.icon_image.subsample(4, 4)
            except Exception as e:
                print(f"Could not load image: {e}")

    def create_widgets(self):
        # 1. Merlin header banner
        header_frame = tk.Frame(self.root, bg="#eef2f7", bd=2, relief="groove")
        header_frame.pack(fill="x", padx=25, pady=(20, 15))

        if self.avatar_image:
            lbl_avatar = tk.Label(header_frame, image=self.avatar_image, bg="#eef2f7")
            lbl_avatar.pack(side="left", padx=20, pady=15)

        self.merlin_label = tk.Label(
            header_frame,
            text="",
            font=("Segoe UI", 14, "italic"),
            bg="#eef2f7",
            fg="#2c3e50",
            wraplength=1250,
            justify="left"
        )
        self.merlin_label.pack(side="left", fill="both", expand=True, padx=15, pady=15)

        # 2. Main container
        main_container = tk.Frame(self.root)
        main_container.pack(fill="both", expand=True, padx=25, pady=(0, 20))

        # Left panel (Fixed 320px sidebar)
        sidebar = ttk.LabelFrame(main_container, text="  Grimoire Actions  ", style="Sidebar.TLabelframe", padding=15)
        sidebar.pack(side="left", fill="y", padx=(0, 20))
        sidebar.pack_propagate(False)
        sidebar.config(width=320)

        ttk.Button(sidebar, text="1. Add Word", style="Sidebar.TButton", command=self.add_word_dialog).pack(fill="x", pady=6)
        ttk.Button(sidebar, text="2. Delete Word", style="Sidebar.TButton", command=self.delete_word_dialog).pack(fill="x", pady=6)
        ttk.Button(sidebar, text="3. Review Words", style="Sidebar.TButton", command=self.restart_review).pack(fill="x", pady=6)
        ttk.Button(sidebar, text="4. Add Set", style="Sidebar.TButton", command=self.add_set_dialog).pack(fill="x", pady=6)
        ttk.Button(sidebar, text="5. Delete Set", style="Sidebar.TButton", command=self.delete_set_dialog).pack(fill="x", pady=6)

        spacer = tk.Frame(sidebar)
        spacer.pack(fill="both", expand=True)

        ttk.Button(sidebar, text="6. Exit", style="Sidebar.TButton", command=self.root.quit).pack(fill="x", pady=(0, 6))

        # Right panel: Set Selector + Flashcard
        right_frame = tk.Frame(main_container)
        right_frame.pack(side="right", fill="both", expand=True)

        # Top bar for set selection
        set_bar = tk.Frame(right_frame)
        set_bar.pack(fill="x", pady=(0, 15))

        lbl_set = tk.Label(set_bar, text="Active Set:", font=("Segoe UI", 13, "bold"), fg="#34495e")
        lbl_set.pack(side="left", padx=(0, 10))

        self.set_combobox = ttk.Combobox(set_bar, state="readonly", font=("Segoe UI", 12))
        self.set_combobox.pack(side="left", fill="x", expand=True)
        self.set_combobox.bind("<<ComboboxSelected>>", self.on_set_changed)

        # Central flashcard display
        self.card_frame = tk.Frame(right_frame, bg="#ffffff", relief="ridge", bd=3)
        self.card_frame.pack(fill="both", expand=True, pady=(0, 15))

        self.label_card = tk.Label(
            self.card_frame,
            text="",
            font=("Segoe UI", 32, "bold"),
            bg="#ffffff",
            fg="#1a1a1a",
            wraplength=880,
            justify="center"
        )
        self.label_card.pack(expand=True, fill="both", padx=40, pady=40)

        # Bottom flashcard controls
        card_controls = tk.Frame(right_frame)
        card_controls.pack(fill="x")

        self.btn_flip = ttk.Button(card_controls, text="Show Answer (Space)", style="CardAction.TButton", command=self.flip_card)
        self.btn_flip.pack(side="left", expand=True, fill="x", padx=(0, 10))

        self.btn_next = ttk.Button(card_controls, text="Next Card (Enter)", style="CardAction.TButton", command=self.next_card)
        self.btn_next.pack(side="right", expand=True, fill="x", padx=(10, 0))

        # Keyboard shortcuts
        self.root.bind("<space>", lambda event: self.flip_card())
        self.root.bind("<Return>", lambda event: self.next_card())

    # --- Merlin Dialog Helper ---
    def merlin_say(self, text):
        self.merlin_label.config(text=f'"{text}"')

    # --- Navigation & Set Logic ---
    def refresh_sets(self, keep_selection=None):
        sets = list(self.vocabulary.keys())
        options = ["All"] + sets
        self.set_combobox["values"] = options

        if keep_selection and keep_selection in options:
            self.set_combobox.set(keep_selection)
        else:
            self.set_combobox.current(0 if options else "")

        self.on_set_changed()

    def on_set_changed(self, event=None):
        chosen = self.set_combobox.get()
        if chosen == "All":
            all_words = {}
            for deck in self.vocabulary.values():
                all_words.update(deck)
            self.current_deck = list(all_words.items())
            self.merlin_say(f"Reviewing all words in the grimoire: {len(self.current_deck)} words in total.")
        else:
            words = self.vocabulary.get(chosen, {})
            self.current_deck = list(words.items())
            self.merlin_say(f"Active set switched to '{chosen}' ({len(self.current_deck)} words).")

        random.shuffle(self.current_deck)
        self.next_card()

    # --- Feature 3: Review words ---
    def restart_review(self):
        self.on_set_changed()

    def next_card(self):
        self.showing_meaning = False
        self.btn_flip.config(text="Show Answer (Space)")

        if not self.current_deck:
            self.current_word = None
            self.label_card.config(text="End of deck!\nWell done.")
            self.merlin_say("You have finished all cards in this deck. You can restart or switch sets.")
            return

        self.current_word = self.current_deck.pop()
        self.label_card.config(text=self.current_word[0])

    def flip_card(self):
        if not self.current_word:
            return

        word, meaning = self.current_word
        if self.showing_meaning:
            self.label_card.config(text=word)
            self.btn_flip.config(text="Show Answer (Space)")
            self.showing_meaning = False
        else:
            self.label_card.config(text=meaning)
            self.btn_flip.config(text="Show Word (Space)")
            self.showing_meaning = True

    # --- Feature 1: Add a word ---
    def add_word_dialog(self):
        current_set = self.set_combobox.get()
        target_set = current_set if current_set != "All" else "Default"

        word = simpledialog.askstring("Add Word", "Enter new word:", parent=self.root)
        if not word:
            return
        meaning = simpledialog.askstring("Add Word", f"Enter definition for '{word}':", parent=self.root)
        if not meaning:
            return

        if target_set not in self.vocabulary:
            self.vocabulary[target_set] = {}

        self.vocabulary[target_set][word.strip()] = meaning.strip()
        save_vocabulary(self.vocabulary)
        self.merlin_say(f"Added '{word}' to the '{target_set}' set.")
        self.refresh_sets(keep_selection=current_set)

    # --- Feature 2: Delete a word ---
    def delete_word_dialog(self):
        current_set = self.set_combobox.get()
        if current_set == "All":
            messagebox.showinfo("Notice", "Please select a specific set in the dropdown to delete a word.")
            return

        word = simpledialog.askstring("Delete Word", f"Word to remove from '{current_set}':", parent=self.root)
        if not word:
            return

        word = word.strip()
        if word in self.vocabulary.get(current_set, {}):
            del self.vocabulary[current_set][word]
            save_vocabulary(self.vocabulary)
            self.merlin_say(f"'{word}' has been banished from '{current_set}'.")
            self.refresh_sets(keep_selection=current_set)
        else:
            messagebox.showwarning("Not Found", f"'{word}' does not exist in '{current_set}'.")

    # --- Feature 4: Add a set ---
    def add_set_dialog(self):
        new_set = simpledialog.askstring("New Set", "Enter set name:", parent=self.root)
        if not new_set:
            return

        new_set = new_set.strip()
        if new_set in self.vocabulary or new_set == "All":
            messagebox.showwarning("Error", "A set with that name already exists or uses a reserved keyword.")
            return

        self.vocabulary[new_set] = {}
        save_vocabulary(self.vocabulary)
        self.merlin_say(f"The set '{new_set}' has been inscribed into the grimoire!")
        self.refresh_sets(keep_selection=new_set)

    # --- Feature 5: Delete a set ---
    def delete_set_dialog(self):
        current_set = self.set_combobox.get()
        if current_set == "All":
            messagebox.showinfo("Notice", "Please select a specific set in the dropdown to delete it.")
            return

        confirm = messagebox.askyesno(
            "Confirm Deletion",
            f"Are you sure you want to delete '{current_set}' and all of its words?"
        )
        if confirm:
            del self.vocabulary[current_set]
            if not self.vocabulary:
                self.vocabulary["Default"] = {}
            save_vocabulary(self.vocabulary)
            self.merlin_say(f"The set '{current_set}' has been erased.")
            self.refresh_sets()


if __name__ == "__main__":
    root = tk.Tk()
    app = VocabApp(root)
    root.mainloop()