package com.soujoaopedro.gerenciador_de_financas.repository;

import com.soujoaopedro.gerenciador_de_financas.domain.Transacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TransacaoRepository extends JpaRepository<Transacao, UUID> {
}